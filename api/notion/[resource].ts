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
 * Notion DB 읽기 전용 리소스 통합 엔드포인트 — Vercel Hobby 플랜의 서버리스 함수
 * 12개 제한 때문에 roster/places/tasks/gallery 4개 파일을 동적 라우트
 * (`api/notion/[resource].ts`) 하나로 합쳤다. 프런트엔드가 부르는 URL
 * (`/api/notion/roster` 등)은 그대로 유지된다. 각 리소스의 로직·불변식은
 * 기존 개별 파일과 동일 — 내용은 응답으로 통과만 하고 서버에 저장·캐시·로그하지 않는다.
 */

/** 출석번호 정렬용 number 속성 이름 후보 (roster) */
const NUM_CANDIDATES = ['번호', '출석번호', 'no', 'num', 'number']
/** 주소 속성 이름 후보 (rich_text, places) */
const ADDRESS_CANDIDATES = ['주소', '위치', '장소', 'address', 'location', 'place']
/** 카테고리 속성 이름 후보 (select/status, places) — 지도 마커 색상/배지 구분용 */
const CATEGORY_CANDIDATES = ['분류', '카테고리', '종류', 'category', 'type']
/** 마감일 속성 이름 후보 (date, tasks) */
const DATE_CANDIDATES = ['마감', '마감일', '날짜', '기한', 'due', 'date', 'deadline', 'due date']
/** 완료 체크박스 속성 이름 후보 (checkbox, tasks) */
const DONE_CHECKBOX_CANDIDATES = ['완료', '완료여부', '완료됨', 'done', 'checked', 'check', '체크']
/** 상태 속성 이름 후보 (status/select, tasks) */
const STATUS_CANDIDATES = ['상태', '진행', '진행상태', 'status', 'progress']
/** 완료로 간주할 상태/선택 이름·그룹 (tasks) */
const DONE_WORDS = ['완료', '완료됨', '완성', '끝', 'done', 'complete', 'completed', 'closed']
/** 파일 속성 이름 후보 (files, gallery) */
const FILES_CANDIDATES = ['갤러리', '파일', '이미지', '사진', 'gallery', 'files', 'media', 'image', 'photo']
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'])

const norm = (s: string) => s.trim().toLowerCase()
const isDoneWord = (name: string) => DONE_WORDS.includes(norm(name))

function kindOf(name: string): 'image' | 'pdf' | 'other' {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (IMAGE_EXT.has(ext)) return 'image'
  return 'other'
}

function pickByType(
  props: [string, { type?: string }][],
  type: string,
  candidates: string[],
): string | null {
  const ofType = props.filter(([, p]) => p.type === type).map(([name]) => name)
  const named = ofType.find((name) => candidates.includes(norm(name)))
  if (named) return named
  return ofType.length === 1 ? ofType[0]! : null
}

function handleAuthError(res: ApiResponse, err: unknown): void {
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

/** 읽기 전용 리소스(roster 제외) 공통 인증 — 위젯 토큰 or 서버 기본 토큰 */
function resolveWidgetAuth(
  req: ApiRequest,
  res: ApiResponse,
): ReturnType<typeof resolveAuth> | null {
  const wt = typeof req.query.wt === 'string' ? req.query.wt : null
  try {
    const auth = resolveAuth(req, wt)
    if (!auth) {
      fail(res, 503, 'notion-token-missing', 'Notion 계정을 연결하거나 서버에 NOTION_TOKEN을 설정하세요.')
      return null
    }
    return auth
  } catch (err) {
    if (err instanceof WidgetTokenInvalidError) {
      fail(res, 401, 'widget-token-invalid', err.message)
      return null
    }
    throw err
  }
}

function resolveDbId(req: ApiRequest, res: ApiResponse, auth: NonNullable<ReturnType<typeof resolveAuth>>): string | null {
  const dbId = auth.lockedDb ?? normalizeDbId(typeof req.query.id === 'string' ? req.query.id : '')
  if (!dbId) {
    fail(res, 400, 'invalid-id', 'DB ID가 없습니다.')
    return null
  }
  return dbId
}

// ---- roster ----

interface RosterPageProps {
  properties?: Record<
    string,
    { type?: string; title?: { plain_text?: string }[]; number?: number }
  >
}

async function handleRoster(req: ApiRequest, res: ApiResponse): Promise<void> {
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
      })) as { results?: RosterPageProps[]; has_more?: boolean; next_cursor?: string }

      for (const row of result.results ?? []) {
        const props = Object.entries(row.properties ?? {})
        const title = props.find(([, p]) => p.type === 'title')?.[1]
        const name = title?.title?.map((t) => t.plain_text ?? '').join('').trim()
        if (!name) continue
        const numEntry = props.find(
          ([propName, p]) => p.type === 'number' && NUM_CANDIDATES.includes(norm(propName)),
        )?.[1]
        entries.push({
          name,
          num: typeof numEntry?.number === 'number' ? numEntry.number : null,
        })
      }
      if (!result.has_more || !result.next_cursor) break
      cursor = result.next_cursor
    }

    const hasNums = entries.some((e) => e.num !== null)
    entries.sort((a, b) =>
      hasNums
        ? (a.num ?? Number.MAX_SAFE_INTEGER) - (b.num ?? Number.MAX_SAFE_INTEGER)
        : a.name.localeCompare(b.name, 'ko'),
    )

    const students = [...new Set(entries.map((e) => e.name))]
    res.status(200).json({ ok: true, students, database })
  } catch (err) {
    handleAuthError(res, err)
  }
}

// ---- places ----

interface PlacesPageProps {
  properties?: Record<
    string,
    {
      type?: string
      title?: { plain_text?: string }[]
      rich_text?: { plain_text?: string }[]
      select?: { name?: string } | null
      status?: { name?: string } | null
    }
  >
}

async function handlePlaces(req: ApiRequest, res: ApiResponse): Promise<void> {
  const auth = resolveWidgetAuth(req, res)
  if (!auth) return
  const dbId = resolveDbId(req, res, auth)
  if (!dbId) return

  try {
    const database = (await getDatabase(auth.token, dbId)) as {
      properties?: Record<string, { type?: string }>
    }
    const propEntries = Object.entries(database.properties ?? {})
    const richTextProps = propEntries
      .filter(([, p]) => p.type === 'rich_text')
      .map(([name]) => name)
    const addressProp =
      richTextProps.find((name) => ADDRESS_CANDIDATES.includes(norm(name))) ??
      (richTextProps.length === 1 ? richTextProps[0] : null)
    if (!addressProp) {
      fail(
        res,
        422,
        'mapping-failed',
        'DB에서 주소 속성을 찾지 못했습니다. 텍스트 속성 이름을 "주소"로 해주세요.',
      )
      return
    }

    const categoryProp =
      propEntries
        .filter(([, p]) => p.type === 'select' || p.type === 'status')
        .map(([name]) => name)
        .find((name) => CATEGORY_CANDIDATES.includes(norm(name))) ?? null

    const places: { name: string; address: string; category?: string }[] = []
    let cursor: string | undefined
    for (let page = 0; page < 2; page++) {
      const result = (await queryDatabase(auth.token, dbId, {
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })) as { results?: PlacesPageProps[]; has_more?: boolean; next_cursor?: string }

      for (const row of result.results ?? []) {
        const props = Object.entries(row.properties ?? {})
        const title = props.find(([, p]) => p.type === 'title')?.[1]
        const name = title?.title?.map((t) => t.plain_text ?? '').join('').trim()
        const address = row.properties?.[addressProp]?.rich_text
          ?.map((t) => t.plain_text ?? '')
          .join('')
          .trim()
        if (!address) continue
        const categoryValue = categoryProp
          ? (row.properties?.[categoryProp]?.select?.name ??
            row.properties?.[categoryProp]?.status?.name ??
            undefined)
          : undefined
        places.push({
          name: name || address,
          address,
          ...(categoryValue ? { category: categoryValue } : {}),
        })
      }
      if (!result.has_more || !result.next_cursor) break
      cursor = result.next_cursor
    }

    res.status(200).json({
      ok: true,
      places,
      database: summarizeDatabase(database),
      addressProp,
      categoryProp,
    })
  } catch (err) {
    handleAuthError(res, err)
  }
}

// ---- tasks ----

interface TasksDbProp {
  type?: string
  status?: { groups?: { name?: string; option_ids?: string[] }[] }
}

interface TasksPageProp {
  type?: string
  title?: { plain_text?: string }[]
  date?: { start?: string } | null
  checkbox?: boolean
  status?: { id?: string; name?: string } | null
  select?: { name?: string } | null
}

interface TasksPageRow {
  properties?: Record<string, TasksPageProp>
}

async function handleTasks(req: ApiRequest, res: ApiResponse): Promise<void> {
  const auth = resolveWidgetAuth(req, res)
  if (!auth) return
  const dbId = resolveDbId(req, res, auth)
  if (!dbId) return

  try {
    const database = (await getDatabase(auth.token, dbId)) as {
      properties?: Record<string, TasksDbProp>
    }
    const props = Object.entries(database.properties ?? {})

    const titleProp = props.find(([, p]) => p.type === 'title')?.[0]
    if (!titleProp) {
      fail(res, 422, 'mapping-failed', 'DB에 제목 속성이 없습니다.')
      return
    }

    const dateProp = pickByType(props, 'date', DATE_CANDIDATES)
    const checkboxProp = pickByType(props, 'checkbox', DONE_CHECKBOX_CANDIDATES)
    const statusProp = checkboxProp ? null : pickByType(props, 'status', STATUS_CANDIDATES)
    const selectProp =
      checkboxProp || statusProp
        ? null
        : props
            .filter(([, p]) => p.type === 'select')
            .map(([name]) => name)
            .find((name) => STATUS_CANDIDATES.includes(norm(name))) ?? null

    const doneStatusIds = new Set<string>()
    if (statusProp) {
      const groups = database.properties?.[statusProp]?.status?.groups ?? []
      for (const g of groups) {
        if (g.name && isDoneWord(g.name)) {
          for (const id of g.option_ids ?? []) doneStatusIds.add(id)
        }
      }
    }

    const doneOf = (p: TasksPageProp | undefined): boolean => {
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
      })) as { results?: TasksPageRow[]; has_more?: boolean; next_cursor?: string }

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
    handleAuthError(res, err)
  }
}

// ---- gallery ----

interface GalleryFileEntry {
  name?: string
  type?: 'file' | 'external'
  file?: { url?: string }
  external?: { url?: string }
}

interface GalleryPageProp {
  type?: string
  title?: { plain_text?: string }[]
  files?: GalleryFileEntry[]
}

interface GalleryPageRow {
  properties?: Record<string, GalleryPageProp>
}

async function handleGallery(req: ApiRequest, res: ApiResponse): Promise<void> {
  const auth = resolveWidgetAuth(req, res)
  if (!auth) return
  const dbId = resolveDbId(req, res, auth)
  if (!dbId) return

  try {
    const database = (await getDatabase(auth.token, dbId)) as {
      properties?: Record<string, { type?: string }>
    }
    const filesProps = Object.entries(database.properties ?? {})
      .filter(([, p]) => p.type === 'files')
      .map(([name]) => name)
    const filesProp =
      filesProps.find((name) => FILES_CANDIDATES.includes(norm(name))) ??
      (filesProps.length === 1 ? filesProps[0] : null)
    if (!filesProp) {
      fail(
        res,
        422,
        'mapping-failed',
        'DB에서 파일과 미디어 속성을 찾지 못했습니다. 속성 이름을 "갤러리" 또는 "파일"로 해주세요.',
      )
      return
    }

    const titleProp = Object.entries(database.properties ?? {}).find(
      ([, p]) => p.type === 'title',
    )?.[0]

    const items: {
      pageTitle: string
      fileName: string
      url: string
      kind: 'image' | 'pdf' | 'other'
    }[] = []
    let cursor: string | undefined
    for (let page = 0; page < 2; page++) {
      const result = (await queryDatabase(auth.token, dbId, {
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })) as { results?: GalleryPageRow[]; has_more?: boolean; next_cursor?: string }

      for (const row of result.results ?? []) {
        const rowProps = row.properties ?? {}
        const pageTitle =
          (titleProp ? rowProps[titleProp]?.title : undefined)
            ?.map((t) => t.plain_text ?? '')
            .join('')
            .trim() || '제목 없음'
        const files = rowProps[filesProp]?.files ?? []
        for (const f of files) {
          const url = f.type === 'external' ? f.external?.url : f.file?.url
          if (!url) continue
          const fileName = f.name ?? url.split('/').pop() ?? '파일'
          items.push({ pageTitle, fileName, url, kind: kindOf(fileName) })
        }
      }
      if (!result.has_more || !result.next_cursor) break
      cursor = result.next_cursor
    }

    res.status(200).json({
      ok: true,
      items,
      database: summarizeDatabase(database),
      filesProp,
    })
  } catch (err) {
    handleAuthError(res, err)
  }
}

const HANDLERS: Record<string, (req: ApiRequest, res: ApiResponse) => Promise<void>> = {
  roster: handleRoster,
  places: handlePlaces,
  tasks: handleTasks,
  gallery: handleGallery,
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (cors(req, res)) return

  const resource = typeof req.query.resource === 'string' ? req.query.resource : ''
  const fn = HANDLERS[resource]
  if (!fn) {
    fail(res, 404, 'not-found', '알 수 없는 리소스입니다.')
    return
  }
  await fn(req, res)
}
