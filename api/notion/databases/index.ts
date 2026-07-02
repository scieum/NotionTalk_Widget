import { cors, fail, type ApiRequest, type ApiResponse } from '../../_lib/http'
import { NoTokenError, NotionApiError, searchDatabases } from '../../_lib/notion'

/** 통합에 연결된 DB 목록 — gallery-cover의 GET /api/notion/databases와 동일 */
export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  if (cors(req, res)) return
  try {
    const databases = await searchDatabases()
    res.status(200).json({ ok: true, databases })
  } catch (err) {
    if (err instanceof NoTokenError) {
      fail(res, 503, 'notion-token-missing', '서버에 NOTION_TOKEN이 없습니다.')
      return
    }
    if (err instanceof NotionApiError) {
      fail(res, 502, 'notion-api', `Notion API 오류 (${err.status})`)
      return
    }
    fail(res, 500, 'internal', '서버 오류')
  }
}
