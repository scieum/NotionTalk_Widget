import { aggregateRecords, type StudyRow } from '@nwh/core'
import { Router } from 'express'
import { z } from 'zod'
import { hasSession, saveSession } from '../db'
import { env } from '../env'
import { getMapping, invalidateMapping, MappingError } from '../mapping'
import { createPage, NotionApiError, NoTokenError, queryDatabase } from '../notion'

export const pomodoroRouter = Router()

const recordSchema = z.object({
  /** 멱등키 — 클라이언트 세션 UUID (도메인 불변식 4) */
  sessionId: z.string().uuid(),
  /** 세션 시작 시각 (ISO) — 기록 행의 날짜가 된다 */
  startedAt: z.string().datetime(),
  minutes: z.number().int().min(1).max(600),
  category: z.string().min(1).max(30).default('뽀모도로'),
  memo: z.string().max(200).optional(),
  dbId: z.string().max(40).optional(),
})

function resolveDbId(raw: string | undefined): string | null {
  const cleaned = raw?.replace(/-/g, '').trim()
  if (cleaned && /^[0-9a-fA-F]{32}$/.test(cleaned)) return cleaned
  return env.defaultPomodoroDb?.replace(/-/g, '') ?? null
}

function sendError(res: import('express').Response, err: unknown): void {
  if (err instanceof NoTokenError) {
    res.status(503).json({
      ok: false,
      error: 'notion-token-missing',
      message: '서버에 NOTION_TOKEN이 없습니다. apps/server/.env를 설정하세요.',
    })
    return
  }
  if (err instanceof MappingError) {
    res.status(422).json({ ok: false, error: 'mapping-failed', message: err.message })
    return
  }
  if (err instanceof NotionApiError) {
    const status = err.status === 404 || err.status === 403 ? err.status : 502
    const message =
      err.status === 404
        ? 'DB를 찾을 수 없습니다. Notion에서 통합에 DB를 공유했는지 확인하세요.'
        : err.status === 403
          ? '통합에 쓰기 권한이 없습니다. Notion 통합 설정에서 "Insert content" 권한을 켜세요.'
          : `Notion API 오류 (${err.status})`
    res.status(status).json({
      ok: false,
      error: 'notion-api',
      message,
    })
    return
  }
  console.error(err)
  res.status(500).json({ ok: false, error: 'internal', message: '서버 오류' })
}

/**
 * 집중 세션 자동기록 — append-only (행 생성만, 수정·삭제 없음).
 * 동일 sessionId 재전송은 멱등 처리 (세션당 정확히 1행).
 */
pomodoroRouter.post('/record', async (req, res) => {
  const parsed = recordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid-body', message: '잘못된 요청' })
    return
  }
  const payload = parsed.data

  const dbId = resolveDbId(payload.dbId)
  if (!dbId) {
    res.status(400).json({
      ok: false,
      error: 'db-missing',
      message: '기록 DB ID가 없습니다. 위젯 설정 또는 서버 .env에 지정하세요.',
    })
    return
  }

  if (hasSession(payload.sessionId)) {
    res.json({ ok: true, duplicate: true })
    return
  }

  const writeRow = async () => {
    const mapping = await getMapping(dbId)
    await createPage({
      parent: { database_id: dbId },
      properties: {
        [mapping.date]: { date: { start: payload.startedAt } },
        [mapping.category]: { select: { name: payload.category } },
        [mapping.minutes]: { number: payload.minutes },
        ...(mapping.memo && payload.memo
          ? { [mapping.memo]: { rich_text: [{ text: { content: payload.memo } }] } }
          : {}),
      },
    })
  }

  try {
    try {
      await writeRow()
    } catch (err) {
      // 사용자가 DB 스키마를 바꿨을 수 있음 — 매핑 1회 재계산 후 재시도
      if (err instanceof NotionApiError && err.status === 400) {
        invalidateMapping(dbId)
        await writeRow()
      } else {
        throw err
      }
    }
    saveSession(payload.sessionId) // Notion 성공 후에만 — 실패 시 클라이언트가 재전송
    res.json({ ok: true })
  } catch (err) {
    sendError(res, err)
  }
})

// 읽기 캐시 (TTL 45초 — 레이트리밋 완충)
const statsCache = new Map<string, { at: number; data: unknown }>()
const CACHE_TTL = 45_000

pomodoroRouter.get('/stats', async (req, res) => {
  const dbId = resolveDbId(typeof req.query.dbId === 'string' ? req.query.dbId : undefined)
  const category =
    typeof req.query.category === 'string' && req.query.category ? req.query.category : null
  if (!dbId) {
    res.status(400).json({ ok: false, error: 'db-missing', message: '기록 DB ID가 없습니다.' })
    return
  }

  const cacheKey = `${dbId}:${category ?? '*'}`
  const cached = statsCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    res.json({ ok: true, stats: cached.data, source: 'cache' })
    return
  }

  try {
    const mapping = await getMapping(dbId)
    const now = new Date()
    // 이번 주(월요일)와 이번 달 중 더 이른 시점부터 조회
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
            {
              date?: { start?: string }
              number?: number
              select?: { name?: string }
            }
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
    statsCache.set(cacheKey, { at: Date.now(), data: stats })
    res.json({ ok: true, stats, source: 'live' })
  } catch (err) {
    // 직전 캐시라도 있으면 그것으로 (DEGRADED)
    if (cached) {
      res.json({ ok: true, stats: cached.data, source: 'stale' })
      return
    }
    sendError(res, err)
  }
})
