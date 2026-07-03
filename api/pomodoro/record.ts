import { resolveAuth, WidgetTokenInvalidError } from '../_lib/auth'
import { cors, fail, type ApiRequest, type ApiResponse } from '../_lib/http'
import { getMapping, invalidateMapping, MappingError } from '../_lib/mapping'
import {
  createPage,
  defaultPomodoroDb,
  normalizeDbId,
  NotionApiError,
  queryDatabase,
} from '../_lib/notion'

/**
 * 집중 세션 자동기록 (서버리스판) — append-only.
 * 서버리스라 SQLite 멱등 저장소가 없으므로, 메모 끝의 세션 마커(#8자)로
 * 중복 재전송을 감지한다 (세션당 정확히 1행).
 * 인증: 위젯 토큰(wt, 임베드) > 세션 쿠키 > 서버 NOTION_TOKEN.
 */

interface RecordPayload {
  sessionId: string
  startedAt: string
  minutes: number
  category: string
  memo?: string
  dbId?: string
  wt?: string
}

function parsePayload(body: unknown): RecordPayload | null {
  if (typeof body !== 'object' || body === null) return null
  const o = body as Record<string, unknown>
  if (typeof o.sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(o.sessionId)) return null
  if (typeof o.startedAt !== 'string' || Number.isNaN(Date.parse(o.startedAt))) return null
  const minutes = typeof o.minutes === 'number' ? Math.floor(o.minutes) : NaN
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) return null
  const category =
    typeof o.category === 'string' && o.category.trim()
      ? o.category.trim().slice(0, 30)
      : '뽀모도로'
  return {
    sessionId: o.sessionId,
    startedAt: o.startedAt,
    minutes,
    category,
    memo: typeof o.memo === 'string' ? o.memo.slice(0, 200) : undefined,
    dbId: typeof o.dbId === 'string' ? o.dbId : undefined,
    wt: typeof o.wt === 'string' && o.wt ? o.wt.slice(0, 1000) : undefined,
  }
}

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  if (cors(req, res)) return
  if (req.method !== 'POST') {
    fail(res, 405, 'method-not-allowed', 'POST만 지원합니다.')
    return
  }

  const payload = parsePayload(req.body)
  if (!payload) {
    fail(res, 400, 'invalid-body', '잘못된 요청')
    return
  }
  let auth
  try {
    auth = resolveAuth(req, payload.wt)
  } catch (err) {
    if (err instanceof WidgetTokenInvalidError) {
      fail(res, 401, 'widget-token-invalid', err.message)
      return
    }
    throw err
  }
  if (!auth) {
    fail(res, 503, 'notion-token-missing', 'Notion 인증 수단이 없습니다.')
    return
  }
  // 위젯 토큰은 발급 시점의 DB로 잠긴다 — 요청 dbId보다 우선
  const dbId =
    auth.lockedDb ?? normalizeDbId(payload.dbId) ?? normalizeDbId(defaultPomodoroDb())
  if (!dbId) {
    fail(res, 400, 'db-missing', '기록 DB ID가 없습니다. 위젯 설정에서 DB를 선택하세요.')
    return
  }
  const token = auth.token

  const marker = `#${payload.sessionId.replace(/-/g, '').slice(0, 8)}`

  try {
    const mapping = await getMapping(token, dbId)

    // 멱등성 — 메모 속성이 있으면 세션 마커로 중복 검사
    if (mapping.memo) {
      const existing = (await queryDatabase(token, dbId, {
        filter: { property: mapping.memo, rich_text: { contains: marker } },
        page_size: 1,
      })) as { results?: unknown[] }
      if ((existing.results ?? []).length > 0) {
        res.status(200).json({ ok: true, duplicate: true })
        return
      }
    }

    const memoText = `${payload.memo ?? ''} ${marker}`.trim()
    const writeRow = async () => {
      const m = await getMapping(token, dbId)
      await createPage(token, {
        parent: { database_id: dbId },
        properties: {
          [m.date]: { date: { start: payload.startedAt } },
          [m.category]: { select: { name: payload.category } },
          [m.minutes]: { number: payload.minutes },
          ...(m.memo
            ? { [m.memo]: { rich_text: [{ text: { content: memoText } }] } }
            : {}),
        },
      })
    }

    try {
      await writeRow()
    } catch (err) {
      // 스키마 변경 가능성 — 매핑 1회 재계산 후 재시도
      if (err instanceof NotionApiError && err.status === 400) {
        invalidateMapping(dbId)
        await writeRow()
      } else {
        throw err
      }
    }
    res.status(200).json({ ok: true })
  } catch (err) {
    if (err instanceof MappingError) {
      fail(res, 422, 'mapping-failed', err.message)
      return
    }
    if (err instanceof NotionApiError) {
      if (err.status === 401) {
        fail(res, 401, 'notion-unauthorized', 'Notion 인가가 해제되었어요. 위젯 편집에서 다시 연결하세요.')
        return
      }
      if (err.status === 404) {
        fail(res, 404, 'notion-api', 'DB를 찾을 수 없습니다. 통합에 DB를 연결(공유)했는지 확인하세요.')
        return
      }
      if (err.status === 403) {
        fail(
          res,
          403,
          'notion-api',
          '통합에 쓰기 권한이 없습니다. Notion 통합 설정에서 "Insert content" 권한을 켜세요.',
        )
        return
      }
      fail(res, 502, 'notion-api', `Notion API 오류 (${err.status})`)
      return
    }
    fail(res, 500, 'internal', '서버 오류')
  }
}
