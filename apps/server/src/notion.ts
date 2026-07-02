import { env } from './env'

/**
 * Notion API 최소 클라이언트 — 토큰은 서버 환경변수에만 존재 (시크릿 경계).
 * 레이트리밋(~3 req/s) 대비: 429/5xx는 지수 백오프로 3회 재시도.
 */

const API = 'https://api.notion.com/v1'
const VERSION = '2022-06-28'

export class NoTokenError extends Error {
  constructor() {
    super('NOTION_TOKEN이 설정되지 않았습니다')
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function notionFetch(path: string, init?: RequestInit): Promise<unknown> {
  if (!env.notionToken) throw new NoTokenError()

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.notionToken}`,
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

export function getDatabase(dbId: string): Promise<unknown> {
  return notionFetch(`/databases/${dbId}`)
}

export function queryDatabase(dbId: string, body: unknown): Promise<unknown> {
  return notionFetch(`/databases/${dbId}/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function createPage(body: unknown): Promise<unknown> {
  return notionFetch('/pages', { method: 'POST', body: JSON.stringify(body) })
}
