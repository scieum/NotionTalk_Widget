import { readSession, type WidgetTokenPayload } from './_lib/auth'
import { fail, type ApiRequest, type ApiResponse } from './_lib/http'
import { getMapping, MappingError } from './_lib/mapping'
import { NotionApiError, normalizeDbId } from './_lib/notion'
import { seal, SealKeyMissingError } from './_lib/seal'

/**
 * 임베드용 위젯 토큰 발급 — sealed {사용자 토큰, DB ID}.
 * 세션(OAuth) 사용자 전용: 발급된 토큰은 해당 DB에만 잠기며,
 * 임베드 URL에 담겨 iframe에서 쿠키 없이 기록을 인증한다.
 */
export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  const session = readSession(req)
  if (!session) {
    fail(res, 401, 'no-session', 'Notion 계정이 연결되어 있지 않습니다.')
    return
  }

  const dbId = normalizeDbId(
    typeof req.query.dbId === 'string' ? req.query.dbId : undefined,
  )
  if (!dbId) {
    fail(res, 400, 'db-missing', 'dbId가 없습니다.')
    return
  }

  try {
    // 발급 전에 접근 가능 + 필수 속성 매핑까지 확인 (기록 시점 오류 예방)
    await getMapping(session.t, dbId)
    const payload: WidgetTokenPayload = { t: session.t, db: dbId }
    res.status(200).json({ ok: true, wt: seal(payload) })
  } catch (err) {
    if (err instanceof SealKeyMissingError) {
      fail(res, 503, 'seal-key-missing', '서버에 NWH_SEAL_KEY가 없습니다.')
      return
    }
    if (err instanceof MappingError) {
      fail(res, 422, 'mapping-failed', err.message)
      return
    }
    if (err instanceof NotionApiError) {
      fail(
        res,
        err.status === 404 ? 404 : 502,
        'notion-api',
        err.status === 404
          ? 'DB를 찾을 수 없습니다. 인가 시 이 DB가 포함됐는지 확인하세요.'
          : `Notion API 오류 (${err.status})`,
      )
      return
    }
    fail(res, 500, 'internal', '서버 오류')
  }
}
