import {
  clearCookie,
  readCookie,
  requestOrigin,
  sendHtml,
  setCookie,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/http'
import { SESSION_COOKIE, type SessionPayload } from '../_lib/auth'
import { seal } from '../_lib/seal'

/**
 * Notion OAuth 콜백 — 코드를 토큰으로 교환해 sealed 세션 쿠키를 심는다.
 * 팝업 창이므로 완료 후 opener에 postMessage하고 스스로 닫는다.
 */

const SESSION_MAX_AGE = 60 * 60 * 24 * 365 // 1년

/** 팝업 종료 HTML — opener에 결과를 알리고 닫기 */
function doneHtml(ok: boolean, message?: string): string {
  const payload = JSON.stringify({ type: 'nwh:oauth', ok, message: message ?? null })
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><title>Notion 연결</title>
<body style="font-family:sans-serif;padding:24px;color:#37352f">
<p>${ok ? '연결되었습니다. 이 창은 곧 닫힙니다.' : `연결 실패: ${message ?? '알 수 없는 오류'}`}</p>
<script>
  try { window.opener && window.opener.postMessage(${payload}, '*') } catch (e) {}
  setTimeout(function () { window.close() }, ${ok ? 400 : 4000})
</script>
</body></html>`
}

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  const q = (k: string) => (typeof req.query[k] === 'string' ? (req.query[k] as string) : '')

  if (q('error')) {
    sendHtml(res, doneHtml(false, '사용자가 인가를 취소했습니다.'))
    return
  }

  const code = q('code')
  const state = q('state')
  const expected = readCookie(req, 'nwh_oauth_state')
  clearCookie(res, 'nwh_oauth_state')

  if (!code || !state || !expected || state !== expected) {
    sendHtml(res, doneHtml(false, '상태 검증에 실패했습니다. 다시 시도하세요.'))
    return
  }

  const clientId = process.env.NOTION_OAUTH_CLIENT_ID?.trim()
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    sendHtml(res, doneHtml(false, '서버에 OAuth 설정이 없습니다.'))
    return
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const exchange = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${requestOrigin(req)}/api/oauth/callback`,
      }),
    })
    const body = (await exchange.json().catch(() => null)) as {
      access_token?: string
      workspace_name?: string
      error?: string
    } | null

    if (!exchange.ok || !body?.access_token) {
      sendHtml(res, doneHtml(false, `토큰 교환 실패 (${body?.error ?? exchange.status})`))
      return
    }

    const session: SessionPayload = {
      t: body.access_token,
      ...(body.workspace_name ? { w: body.workspace_name } : {}),
    }
    setCookie(res, SESSION_COOKIE, seal(session), SESSION_MAX_AGE)
    sendHtml(res, doneHtml(true))
  } catch {
    sendHtml(res, doneHtml(false, '토큰 교환 중 서버 오류'))
  }
}
