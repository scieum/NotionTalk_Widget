/**
 * Vercel 서버리스 함수 공용 — 최소 타입과 응답 헬퍼 (외부 의존성 없음).
 */

export interface ApiRequest {
  method?: string
  query: Record<string, string | string[] | undefined>
  body?: unknown
}

export interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
  end: () => void
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
