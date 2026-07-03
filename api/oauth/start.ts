import { randomBytes } from 'node:crypto'
import {
  fail,
  redirect,
  requestOrigin,
  setCookie,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/http'

/**
 * Notion OAuth 인가 시작 — 상태 쿠키를 심고 Notion 동의 화면으로 리다이렉트.
 * 팝업 창에서 열리는 것을 전제로 한다 (콜백이 postMessage 후 창을 닫음).
 */
export default function handler(req: ApiRequest, res: ApiResponse): void {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID?.trim()
  if (!clientId) {
    fail(res, 503, 'oauth-unconfigured', 'NOTION_OAUTH_CLIENT_ID가 설정되지 않았습니다.')
    return
  }

  const state = randomBytes(16).toString('hex')
  setCookie(res, 'nwh_oauth_state', state, 600)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    owner: 'user',
    redirect_uri: `${requestOrigin(req)}/api/oauth/callback`,
    state,
  })
  redirect(res, `https://api.notion.com/v1/oauth/authorize?${params}`)
}
