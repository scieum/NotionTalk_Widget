import { resolveAuth } from '../../_lib/auth'
import { cors, fail, type ApiRequest, type ApiResponse } from '../../_lib/http'
import { NotionApiError, searchDatabases } from '../../_lib/notion'

/** 접근 가능한 DB 목록 — 세션(OAuth) 사용자 토큰 우선, 없으면 서버 토큰 */
export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  if (cors(req, res)) return
  const auth = resolveAuth(req)
  if (!auth) {
    fail(res, 503, 'notion-token-missing', 'Notion 계정을 연결하거나 서버에 NOTION_TOKEN을 설정하세요.')
    return
  }
  try {
    const databases = await searchDatabases(auth.token)
    res.status(200).json({ ok: true, databases, source: auth.source })
  } catch (err) {
    if (err instanceof NotionApiError) {
      if (err.status === 401) {
        fail(res, 401, 'notion-unauthorized', 'Notion 인가가 만료되었어요. 다시 연결하세요.')
        return
      }
      fail(res, 502, 'notion-api', `Notion API 오류 (${err.status})`)
      return
    }
    fail(res, 500, 'internal', '서버 오류')
  }
}
