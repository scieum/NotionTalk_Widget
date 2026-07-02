import { cors, fail, type ApiRequest, type ApiResponse } from '../../_lib/http'
import { getMapping, MappingError } from '../../_lib/mapping'
import {
  getDatabase,
  normalizeDbId,
  NoTokenError,
  NotionApiError,
  summarizeDatabase,
} from '../../_lib/notion'

/** DB ID 직접 입력 검증 — gallery-cover의 GET /api/notion/databases/:id와 동일 */
export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  if (cors(req, res)) return
  const raw = typeof req.query.id === 'string' ? req.query.id : ''
  const dbId = normalizeDbId(raw)
  if (!dbId) {
    fail(res, 400, 'invalid-id', 'DB ID 형식이 아닙니다 (32자리 ID 또는 링크의 ID 부분).')
    return
  }
  try {
    const database = summarizeDatabase(await getDatabase(dbId))
    // 필수 속성 매핑 가능 여부까지 미리 확인해준다
    let mappingOk = true
    let mappingMessage: string | null = null
    try {
      await getMapping(dbId)
    } catch (err) {
      mappingOk = false
      mappingMessage = err instanceof MappingError ? err.message : '속성 확인 실패'
    }
    res.status(200).json({ ok: true, database, mappingOk, mappingMessage })
  } catch (err) {
    if (err instanceof NoTokenError) {
      fail(res, 503, 'notion-token-missing', '서버에 NOTION_TOKEN이 없습니다.')
      return
    }
    if (err instanceof NotionApiError && err.status === 404) {
      fail(res, 404, 'not-found', 'DB를 찾을 수 없습니다. 통합에 DB를 연결(공유)했는지 확인하세요.')
      return
    }
    fail(res, 500, 'internal', '서버 오류')
  }
}
