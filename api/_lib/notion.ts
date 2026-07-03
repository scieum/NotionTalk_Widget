/**
 * Notion API 클라이언트 (서버리스용) — 호출자가 인증 컨텍스트의 토큰을 넘긴다.
 * (OAuth 사용자 토큰 / 세션 쿠키 / 서버 환경변수 — 결정은 auth.ts)
 * apps/server/src/notion.ts와 동일 규약: 429/5xx 지수 백오프 3회.
 */

const API = 'https://api.notion.com/v1'
const VERSION = '2022-06-28'

export class NoTokenError extends Error {
  constructor() {
    super('Notion 토큰이 없습니다')
  }
}

export class NotionApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`Notion API ${status}`)
  }
}

export function envToken(): string | null {
  return process.env.NOTION_TOKEN?.trim() || null
}

export function defaultPomodoroDb(): string | null {
  return process.env.NOTION_POMODORO_DB?.trim() || null
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function notionFetch(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': VERSION,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
    if (res.ok) return res.json()

    const retriable = res.status === 429 || res.status >= 500
    if (retriable && attempt < 3) {
      const retryAfter = Number(res.headers.get('retry-after'))
      await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 400 * 2 ** attempt)
      continue
    }
    throw new NotionApiError(res.status, await res.json().catch(() => null))
  }
}

export interface DatabaseSummary {
  id: string
  title: string
  icon: string | null
}

interface RawDatabase {
  id?: string
  title?: { plain_text?: string }[]
  icon?: { type?: string; emoji?: string } | null
}

function summarize(db: RawDatabase): DatabaseSummary {
  return {
    id: db.id ?? '',
    title: db.title?.map((t) => t.plain_text ?? '').join('') || '제목 없음',
    icon: db.icon?.type === 'emoji' ? (db.icon.emoji ?? null) : null,
  }
}

/** 통합/사용자에 연결(공유)된 데이터베이스 목록 — search API */
export async function searchDatabases(token: string): Promise<DatabaseSummary[]> {
  const result = (await notionFetch(token, '/search', {
    method: 'POST',
    body: JSON.stringify({
      filter: { property: 'object', value: 'database' },
      page_size: 100,
    }),
  })) as { results?: RawDatabase[] }
  return (result.results ?? []).map(summarize)
}

export async function getDatabase(token: string, dbId: string): Promise<unknown> {
  return notionFetch(token, `/databases/${dbId}`)
}

export function summarizeDatabase(db: unknown): DatabaseSummary {
  return summarize(db as RawDatabase)
}

export function queryDatabase(
  token: string,
  dbId: string,
  body: unknown,
): Promise<unknown> {
  return notionFetch(token, `/databases/${dbId}/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function createPage(token: string, body: unknown): Promise<unknown> {
  return notionFetch(token, '/pages', { method: 'POST', body: JSON.stringify(body) })
}

export function normalizeDbId(raw: string | undefined | null): string | null {
  const cleaned = raw?.replace(/-/g, '').trim()
  if (cleaned && /^[0-9a-fA-F]{32}$/.test(cleaned)) return cleaned
  return null
}
