import { SESSION_COOKIE } from '../_lib/auth'
import { clearCookie, fail, type ApiRequest, type ApiResponse } from '../_lib/http'

/** 세션 쿠키 삭제 — Notion 쪽 인가 자체는 사용자가 Notion 설정에서 해제 */
export default function handler(req: ApiRequest, res: ApiResponse): void {
  if (req.method !== 'POST') {
    fail(res, 405, 'method-not-allowed', 'POST만 지원합니다.')
    return
  }
  clearCookie(res, SESSION_COOKIE)
  res.status(200).json({ ok: true })
}
