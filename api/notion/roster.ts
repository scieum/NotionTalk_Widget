import { resolveAuth } from '../_lib/auth'
import { cors, fail, type ApiRequest, type ApiResponse } from '../_lib/http'
import {
  getDatabase,
  normalizeDbId,
  NotionApiError,
  queryDatabase,
  summarizeDatabase,
} from '../_lib/notion'

/**
 * 명렬표 불러오기 — DB의 제목(title) 속성에서 학생 이름 목록을 추출한다.
 * 명단 개인정보 규약: 이름은 응답으로 통과만 하고 서버 어디에도
 * 저장·캐시·로그하지 않는다. 클라이언트(localStorage 프리셋)에만 남는다.
 */

/** 출석번호 정렬용 number 속성 이름 후보 */
const NUM_CANDIDATES = ['번호', '출석번호', 'no', 'num', 'number']

interface PageProps {
  properties?: Record<
    string,
    {
      type?: string
      title?: { plain_text?: string }[]
      number?: number
    }
  >
}

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  if (cors(req, res)) return

  const dbId = normalizeDbId(typeof req.query.id === 'string' ? req.query.id : '')
  if (!dbId) {
    fail(res, 400, 'invalid-id', 'DB ID 형식이 아닙니다.')
    return
  }
  const auth = resolveAuth(req)
  if (!auth) {
    fail(res, 503, 'notion-token-missing', 'Notion 계정을 연결하거나 서버에 NOTION_TOKEN을 설정하세요.')
    return
  }

  try {
    const database = summarizeDatabase(await getDatabase(auth.token, dbId))

    const entries: { name: string; num: number | null }[] = []
    let cursor: string | undefined
    for (let page = 0; page < 3; page++) {
      const result = (await queryDatabase(auth.token, dbId, {
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })) as { results?: PageProps[]; has_more?: boolean; next_cursor?: string }

      for (const row of result.results ?? []) {
        const props = Object.entries(row.properties ?? {})
        const title = props.find(([, p]) => p.type === 'title')?.[1]
        const name = title?.title?.map((t) => t.plain_text ?? '').join('').trim()
        if (!name) continue
        const numEntry = props.find(
          ([propName, p]) =>
            p.type === 'number' &&
            NUM_CANDIDATES.includes(propName.trim().toLowerCase()),
        )?.[1]
        entries.push({
          name,
          num: typeof numEntry?.number === 'number' ? numEntry.number : null,
        })
      }
      if (!result.has_more || !result.next_cursor) break
      cursor = result.next_cursor
    }

    // 출석번호가 있으면 번호순, 없으면 이름 가나다순
    const hasNums = entries.some((e) => e.num !== null)
    entries.sort((a, b) =>
      hasNums
        ? (a.num ?? Number.MAX_SAFE_INTEGER) - (b.num ?? Number.MAX_SAFE_INTEGER)
        : a.name.localeCompare(b.name, 'ko'),
    )

    // 중복 이름 제거 (동명이인은 명렬표에서 구분 표기했을 것)
    const students = [...new Set(entries.map((e) => e.name))]
    res.status(200).json({ ok: true, students, database })
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
