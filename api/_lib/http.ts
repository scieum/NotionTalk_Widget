/**
 * Vercel 서버리스 함수 공용 — 최소 타입과 응답 헬퍼 (외부 의존성 없음).
 */

export interface ApiRequest {
  method?: string
  query: Record<string, string | string[] | undefined>
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

export interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string | string[]) => void
  end: (body?: string) => void
}

export function cors(req: ApiRequest, res: ApiResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

export function fail(
  res: ApiResponse,
  status: number,
  error: string,
  message: string,
): void {
  res.status(status).json({ ok: false, error, message })
}

// ---- 쿠키 (OAuth 세션용) ----

function headerValue(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
}

export function readCookie(req: ApiRequest, name: string): string | null {
  const raw = headerValue(req.headers?.cookie)
  if (!raw) return null
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim())
    }
  }
  return null
}

const COOKIES_SET = Symbol.for('nwh.cookies')

/** Set-Cookie 다건 지원 — setHeader가 덮어쓰므로 누적 배열로 관리 */
export function setCookie(
  res: ApiResponse,
  name: string,
  value: string,
  maxAgeSec: number,
): void {
  const cookie =
    `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax` +
    `; Max-Age=${maxAgeSec}`
  const holder = res as ApiResponse & { [COOKIES_SET]?: string[] }
  const list = holder[COOKIES_SET] ?? []
  list.push(cookie)
  holder[COOKIES_SET] = list
  res.setHeader('Set-Cookie', list)
}

export function clearCookie(res: ApiResponse, name: string): void {
  setCookie(res, name, '', 0)
}

/** 요청 오리진 (Vercel 프록시 뒤) — 리다이렉트 URI 구성용 */
export function requestOrigin(req: ApiRequest): string {
  const host = headerValue(req.headers?.['x-forwarded-host']) || headerValue(req.headers?.host)
  const proto = headerValue(req.headers?.['x-forwarded-proto']) || 'https'
  return `${proto}://${host}`
}

export function redirect(res: ApiResponse, url: string): void {
  res.setHeader('Location', url)
  res.status(302).end()
}

export function sendHtml(res: ApiResponse, html: string): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).end(html)
}
