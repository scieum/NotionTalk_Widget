import { resolveAuth } from '../_lib/auth'
import { cors, fail, type ApiRequest, type ApiResponse } from '../_lib/http'
import { getMapping, MappingError } from '../_lib/mapping'
import {
  getDatabase,
  normalizeDbId,
  NotionApiError,
  summarizeDatabase,
} from '../_lib/notion'

/**
 * DB ID 직접 입력 검증 — gallery-cover의 GET /api/notion/databases/:id와 동일 동작.
 * Vercel의 파일 기반 동적 라우트([id].ts)가 vercel.json의 catch-all rewrite와
 * 충돌해 프로덕션에서 매칭되지 않는 문제가 있어, 쿼리 파라미터 방식으로 변경.
 */
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
  const auth = resolveAuth(req)
  if (!auth) {
    fail(res, 503, 'notion-token-missing', 'Notion 계정을 연결하거나 서버에 NOTION_TOKEN을 설정하세요.')
    return
  }
  try {
    const database = summarizeDatabase(await getDatabase(auth.token, dbId))
    // 필수 속성 매핑 가능 여부까지 미리 확인해준다
    let mappingOk = true
    let mappingMessage: string | null = null
    try {
      await getMapping(auth.token, dbId)
    } catch (err) {
      mappingOk = false
      mappingMessage = err instanceof MappingError ? err.message : '속성 확인 실패'
    }
    res.status(200).json({ ok: true, database, mappingOk, mappingMessage })
  } catch (err) {
    if (err instanceof NotionApiError && err.status === 404) {
      fail(res, 404, 'not-found', 'DB를 찾을 수 없습니다. 통합/인가에 DB가 포함됐는지 확인하세요.')
      return
    }
    if (err instanceof NotionApiError && err.status === 401) {
      fail(res, 401, 'notion-unauthorized', 'Notion 인가가 만료되었어요. 다시 연결하세요.')
      return
    }
    fail(res, 500, 'internal', '서버 오류')
  }
}
