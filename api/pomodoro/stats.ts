import { aggregateRecords, type StudyRow } from '../../packages/core/src/aggregate'
import { cors, fail, type ApiRequest, type ApiResponse } from '../_lib/http'
import { getMapping, MappingError } from '../_lib/mapping'
import {
  defaultPomodoroDb,
  normalizeDbId,
  NoTokenError,
  NotionApiError,
  queryDatabase,
} from '../_lib/notion'

// 읽기 캐시 (TTL 45초 — 레이트리밋 완충, 웜 인스턴스 동안 유지)
const cache = new Map<string, { at: number; data: unknown }>()
const CACHE_TTL = 45_000

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  if (cors(req, res)) return

  const dbId =
    normalizeDbId(typeof req.query.dbId === 'string' ? req.query.dbId : undefined) ??
    normalizeDbId(defaultPomodoroDb())
  const category =
    typeof req.query.category === 'string' && req.query.category
      ? req.query.category
      : null
  if (!dbId) {
    fail(res, 400, 'db-missing', '기록 DB ID가 없습니다.')
    return
  }

  const cacheKey = `${dbId}:${category ?? '*'}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    res.status(200).json({ ok: true, stats: cached.data, source: 'cache' })
    return
  }

  try {
    const mapping = await getMapping(dbId)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
    const from = (day < monthStart ? day : monthStart).toISOString()

    const rows: StudyRow[] = []
    let cursor: string | undefined
    for (let page = 0; page < 5; page++) {
      const result = (await queryDatabase(dbId, {
        filter: { property: mapping.date, date: { on_or_after: from } },
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })) as {
        results?: {
          properties?: Record<
            string,
            { date?: { start?: string }; number?: number; select?: { name?: string } }
          >
        }[]
        has_more?: boolean
        next_cursor?: string
      }

      for (const pageObj of result.results ?? []) {
        const props = pageObj.properties ?? {}
        const rowCategory = props[mapping.category]?.select?.name
        if (category && rowCategory !== category) continue
        const date = props[mapping.date]?.date?.start
        const minutes = props[mapping.minutes]?.number
        if (!date || typeof minutes !== 'number') continue
        rows.push({ date, minutes, category: rowCategory })
      }
      if (!result.has_more || !result.next_cursor) break
      cursor = result.next_cursor
    }

    const stats = aggregateRecords(rows, now)
    cache.set(cacheKey, { at: Date.now(), data: stats })
    res.status(200).json({ ok: true, stats, source: 'live' })
  } catch (err) {
    if (cached) {
      res.status(200).json({ ok: true, stats: cached.data, source: 'stale' })
      return
    }
    if (err instanceof NoTokenError) {
      fail(res, 503, 'notion-token-missing', '서버에 NOTION_TOKEN이 없습니다.')
      return
    }
    if (err instanceof MappingError) {
      fail(res, 422, 'mapping-failed', err.message)
      return
    }
    if (err instanceof NotionApiError) {
      fail(res, 502, 'notion-api', `Notion API 오류 (${err.status})`)
      return
    }
    fail(res, 500, 'internal', '서버 오류')
  }
}
