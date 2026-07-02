import { Router } from 'express'
import { getMapping, MappingError } from '../mapping'
import { getDatabase, NotionApiError, NoTokenError, notionFetch } from '../notion'

export const notionRouter = Router()

interface RawDatabase {
  id?: string
  title?: { plain_text?: string }[]
  icon?: { type?: string; emoji?: string } | null
}

function summarize(db: RawDatabase) {
  return {
    id: db.id ?? '',
    title: db.title?.map((t) => t.plain_text ?? '').join('') || '제목 없음',
    icon: db.icon?.type === 'emoji' ? (db.icon.emoji ?? null) : null,
  }
}

function sendError(res: import('express').Response, err: unknown): void {
  if (err instanceof NoTokenError) {
    res
      .status(503)
      .json({ ok: false, error: 'notion-token-missing', message: '서버에 NOTION_TOKEN이 없습니다.' })
    return
  }
  if (err instanceof NotionApiError && err.status === 404) {
    res.status(404).json({
      ok: false,
      error: 'not-found',
      message: 'DB를 찾을 수 없습니다. 통합에 DB를 연결(공유)했는지 확인하세요.',
    })
    return
  }
  console.error(err)
  res.status(502).json({ ok: false, error: 'notion-api', message: 'Notion API 오류' })
}

/** 통합에 연결된 DB 목록 */
notionRouter.get('/databases', async (_req, res) => {
  try {
    const result = (await notionFetch('/search', {
      method: 'POST',
      body: JSON.stringify({
        filter: { property: 'object', value: 'database' },
        page_size: 100,
      }),
    })) as { results?: RawDatabase[] }
    res.json({ ok: true, databases: (result.results ?? []).map(summarize) })
  } catch (err) {
    sendError(res, err)
  }
})

/** DB ID 직접 입력 검증 + 필수 속성 매핑 확인 (쿼리 파라미터 — Vercel과 동일 규약) */
notionRouter.get('/database', async (req, res) => {
  const raw = typeof req.query.id === 'string' ? req.query.id : ''
  const dbId = raw.replace(/-/g, '')
  if (!/^[0-9a-fA-F]{32}$/.test(dbId)) {
    res.status(400).json({ ok: false, error: 'invalid-id', message: 'DB ID 형식이 아닙니다.' })
    return
  }
  try {
    const database = summarize((await getDatabase(dbId)) as RawDatabase)
    let mappingOk = true
    let mappingMessage: string | null = null
    try {
      await getMapping(dbId)
    } catch (err) {
      mappingOk = false
      mappingMessage = err instanceof MappingError ? err.message : '속성 확인 실패'
    }
    res.json({ ok: true, database, mappingOk, mappingMessage })
  } catch (err) {
    sendError(res, err)
  }
})
