import { readSession } from '../_lib/auth'
import { type ApiRequest, type ApiResponse } from '../_lib/http'
import { envToken } from '../_lib/notion'

/**
 * 세션 상태 조회 — 빌더 UI가 "내 Notion 연결됨" 여부를 표시하는 데 쓴다.
 * 쿠키 기반이므로 CORS 없이 동일 오리진 요청만 지원.
 */
export default function handler(req: ApiRequest, res: ApiResponse): void {
  const oauthReady = Boolean(process.env.NOTION_OAUTH_CLIENT_ID?.trim())
  let session = null
  try {
    session = readSession(req)
  } catch {
    // NWH_SEAL_KEY 미설정 — 미연결로 취급
  }
  res.status(200).json({
    ok: true,
    oauth: oauthReady,
    connected: Boolean(session),
    workspace: session?.w ?? null,
    serverToken: Boolean(envToken()),
  })
}
