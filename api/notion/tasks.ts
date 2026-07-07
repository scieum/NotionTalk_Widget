import { resolveAuth, WidgetTokenInvalidError } from '../_lib/auth'
import { cors, fail, type ApiRequest, type ApiResponse } from '../_lib/http'
import {
  getDatabase,
  normalizeDbId,
  NotionApiError,
  queryDatabase,
  summarizeDatabase,
} from '../_lib/notion'

/**
 * 할일 목록 — 캘린더/할일 위젯용. DB의 제목(title) + 마감일(date) +
 * 완료 여부(checkbox/status/select) 속성을 읽어 읽기 전용으로 통과시킨다.
 * 장소 DB와 동일하게 내용은 응답으로 통과만 하고 서버에 저장·캐시·로그하지 않는다.
 * 도메인 불변식(대시보드만 쓰기)에 따라 완료 상태를 Notion에 역기록하지 않는다.
 */

/** 마감일 속성 이름 후보 (타입 date) */
const DATE_CANDIDATES = ['마감', '마감일', '날짜', '기한', 'due', 'date', 'deadline', 'due date']
/** 완료 체크박스 속성 이름 후보 (타입 checkbox) */
const DONE_CHECKBOX_CANDIDATES = ['완료', '완료여부', '완료됨', 'done', 'checked', 'check', '체크']
/** 상태 속성 이름 후보 (타입 status/select) */
const STATUS_CANDIDATES = ['상태', '진행', '진행상태', 'status', 'progress']
/** 완료로 간주할 상태/선택 이름·그룹 (소문자 비교, 한글은 그대로) */
const DONE_WORDS = ['완료', '완료됨', '완성', '끝', 'done', 'complete', 'completed', 'closed']

const norm = (s: string) => s.trim().toLowerCase()
const isDoneWord = (name: string) => DONE_WORDS.includes(norm(name))

interface DbProp {
  type?: string
  status?: { groups?: { name?: string; option_ids?: string[] }[] }
}

interface PageProp {
  type?: string
  title?: { plain_text?: string }[]
  date?: { start?: string } | null
  checkbox?: boolean
  status?: { id?: string; name?: string } | null
  select?: { name?: string } | null
}

interface PageRow {
  properties?: Record<string, PageProp>
}

/** 이름 후보 우선, 없으면 해당 타입이 유일할 때만 그것 */
function pickByType(
  props: [string, DbProp][],
  type: string,
  candidates: string[],
): string | null {
  const ofType = props.filter(([, p]) => p.type === type).map(([name]) => name)
  const named = ofType.find((name) => candidates.includes(norm(name)))
  if (named) return named
  return ofType.length === 1 ? ofType[0]! : null
}

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  if (cors(req, res)) return

  const wt = typeof req.query.wt === 'string' ? req.query.wt : null
  let auth
  try {
    auth = resolveAuth(req, wt)
  } catch (err) {
    if (err instanceof WidgetTokenInvalidError) {
      fail(res, 401, 'widget-token-invalid', err.message)
      return
    }
    throw err
  }
  if (!auth) {
    fail(res, 503, 'notion-token-missing', 'Notion 계정을 연결하거나 서버에 NOTION_TOKEN을 설정하세요.')
    return
  }

  const dbId =
    auth.lockedDb ??
    normalizeDbId(typeof req.query.id === 'string' ? req.query.id : '')
  if (!dbId) {
    fail(res, 400, 'invalid-id', 'DB ID가 없습니다.')
    return
  }

  try {
    const database = (await getDatabase(auth.token, dbId)) as {
      properties?: Record<string, DbProp>
    }
    const props = Object.entries(database.properties ?? {})

    // 제목 속성은 항상 존재 — 없으면 할일로 못 씀
    const titleProp = props.find(([, p]) => p.type === 'title')?.[0]
    if (!titleProp) {
      fail(res, 422, 'mapping-failed', 'DB에 제목 속성이 없습니다.')
      return
    }

    const dateProp = pickByType(props, 'date', DATE_CANDIDATES)

    // 완료 판정 속성: 체크박스 우선 → status → select(이름이 상태류일 때만)
    const checkboxProp = pickByType(props, 'checkbox', DONE_CHECKBOX_CANDIDATES)
    const statusProp = checkboxProp ? null : pickByType(props, 'status', STATUS_CANDIDATES)
    const selectProp =
      checkboxProp || statusProp
        ? null
        : props
            .filter(([, p]) => p.type === 'select')
            .map(([name]) => name)
            .find((name) => STATUS_CANDIDATES.includes(norm(name))) ?? null

    // status 그룹 중 "완료" 그룹에 속한 옵션 id 집합 (그룹 정보로 견고하게 판정)
    const doneStatusIds = new Set<string>()
    if (statusProp) {
      const groups = database.properties?.[statusProp]?.status?.groups ?? []
      for (const g of groups) {
        if (g.name && isDoneWord(g.name)) {
          for (const id of g.option_ids ?? []) doneStatusIds.add(id)
        }
      }
    }

    const doneOf = (p: PageProp | undefined): boolean => {
      if (!p) return false
      if (checkboxProp) return p.checkbox === true
      if (statusProp) {
        const st = p.status
        if (!st) return false
        if (st.id && doneStatusIds.has(st.id)) return true
        return st.name ? isDoneWord(st.name) : false
      }
      if (selectProp) return p.select?.name ? isDoneWord(p.select.name) : false
      return false
    }

    const tasks: { title: string; date: string | null; done: boolean }[] = []
    let cursor: string | undefined
    for (let page = 0; page < 2; page++) {
      const result = (await queryDatabase(auth.token, dbId, {
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })) as { results?: PageRow[]; has_more?: boolean; next_cursor?: string }

      for (const row of result.results ?? []) {
        const rowProps = row.properties ?? {}
        const title = rowProps[titleProp]?.title
          ?.map((t) => t.plain_text ?? '')
          .join('')
          .trim()
        if (!title) continue
        const date = (dateProp ? rowProps[dateProp]?.date?.start : null) ?? null
        const done = doneOf(
          checkboxProp
            ? rowProps[checkboxProp]
            : statusProp
              ? rowProps[statusProp]
              : selectProp
                ? rowProps[selectProp]
                : undefined,
        )
        tasks.push({ title, date, done })
      }
      if (!result.has_more || !result.next_cursor) break
      cursor = result.next_cursor
    }

    res.status(200).json({
      ok: true,
      tasks,
      database: summarizeDatabase(database),
      fields: { titleProp, dateProp, doneProp: checkboxProp ?? statusProp ?? selectProp ?? null },
    })
  } catch (err) {
    if (err instanceof NotionApiError) {
      if (err.status === 401) {
        fail(res, 401, 'notion-unauthorized', 'Notion 인가가 만료되었어요. 다시 연결하세요.')
        return
      }
      if (err.status === 404) {
        fail(res, 404, 'not-found', 'DB를 찾을 수 없습니다. 인가/통합에 DB가 포함됐는지 확인하세요.')
        return
      }
      fail(res, 502, 'notion-api', `Notion API 오류 (${err.status})`)
      return
    }
    fail(res, 500, 'internal', '서버 오류')
  }
}
