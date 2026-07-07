import { resolveAuth, WidgetTokenInvalidError } from '../_lib/auth'
import { cors, fail, type ApiRequest, type ApiResponse } from '../_lib/http'
import {
  getDatabase,
  normalizeDbId,
  NotionApiError,
  queryDatabase,
  summarizeDatabase,
} from '../_lib/notion'

/**
 * 갤러리 — 파일과 미디어(files) 속성을 읽어 파일 단위로 펼쳐(flatten) 응답한다.
 * 장소/할일 DB와 동일하게 내용은 응답으로 통과만 하고 서버에 저장·캐시·로그하지
 * 않는다. Notion의 파일 URL(특히 업로드형)은 서명돼 있어 시간이 지나면 만료되므로
 * 절대 캐시하지 않고 매 요청 최신 URL을 전달한다.
 */

/** 파일 속성 이름 후보 (타입 files) */
const FILES_CANDIDATES = ['갤러리', '파일', '이미지', '사진', 'gallery', 'files', 'media', 'image', 'photo']

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'])

function kindOf(name: string): 'image' | 'pdf' | 'other' {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (IMAGE_EXT.has(ext)) return 'image'
  return 'other'
}

interface FileEntry {
  name?: string
  type?: 'file' | 'external'
  file?: { url?: string }
  external?: { url?: string }
}

interface PageProp {
  type?: string
  title?: { plain_text?: string }[]
  files?: FileEntry[]
}

interface PageRow {
  properties?: Record<string, PageProp>
}

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  if (cors(req, res)) return

  const wt = typeof req.query.wt === 'string' ? req.query.wt : null
  let auth
  try {
    auth = resolveAuth(req, wt)
  } catch (err) {
    if (err instanceof WidgetTokenInvalidError) {
      fail(res, 401, 'widget-token-invalid', err.message)
      return
    }
    throw err
  }
  if (!auth) {
    fail(res, 503, 'notion-token-missing', 'Notion 계정을 연결하거나 서버에 NOTION_TOKEN을 설정하세요.')
    return
  }

  const dbId =
    auth.lockedDb ??
    normalizeDbId(typeof req.query.id === 'string' ? req.query.id : '')
  if (!dbId) {
    fail(res, 400, 'invalid-id', 'DB ID가 없습니다.')
    return
  }

  try {
    const database = (await getDatabase(auth.token, dbId)) as {
      properties?: Record<string, { type?: string }>
    }
    const filesProps = Object.entries(database.properties ?? {})
      .filter(([, p]) => p.type === 'files')
      .map(([name]) => name)
    const norm = (s: string) => s.trim().toLowerCase()
    const filesProp =
      filesProps.find((name) => FILES_CANDIDATES.includes(norm(name))) ??
      (filesProps.length === 1 ? filesProps[0] : null)
    if (!filesProp) {
      fail(
        res,
        422,
        'mapping-failed',
        'DB에서 파일과 미디어 속성을 찾지 못했습니다. 속성 이름을 "갤러리" 또는 "파일"로 해주세요.',
      )
      return
    }

    const titleProp = Object.entries(database.properties ?? {}).find(
      ([, p]) => p.type === 'title',
    )?.[0]

    const items: {
      pageTitle: string
      fileName: string
      url: string
      kind: 'image' | 'pdf' | 'other'
    }[] = []
    let cursor: string | undefined
    for (let page = 0; page < 2; page++) {
      const result = (await queryDatabase(auth.token, dbId, {
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })) as { results?: PageRow[]; has_more?: boolean; next_cursor?: string }

      for (const row of result.results ?? []) {
        const props = row.properties ?? {}
        const pageTitle =
          (titleProp ? props[titleProp]?.title : undefined)
            ?.map((t) => t.plain_text ?? '')
            .join('')
            .trim() || '제목 없음'
        const files = props[filesProp]?.files ?? []
        for (const f of files) {
          const url = f.type === 'external' ? f.external?.url : f.file?.url
          if (!url) continue
          const fileName = f.name ?? url.split('/').pop() ?? '파일'
          items.push({ pageTitle, fileName, url, kind: kindOf(fileName) })
        }
      }
      if (!result.has_more || !result.next_cursor) break
      cursor = result.next_cursor
    }

    res.status(200).json({
      ok: true,
      items,
      database: summarizeDatabase(database),
      filesProp,
    })
  } catch (err) {
    if (err instanceof NotionApiError) {
      if (err.status === 401) {
        fail(res, 401, 'notion-unauthorized', 'Notion 인가가 만료되었어요. 다시 연결하세요.')
        return
      }
      if (err.status === 404) {
        fail(res, 404, 'not-found', 'DB를 찾을 수 없습니다. 인가/통합에 DB가 포함됐는지 확인하세요.')
        return
      }
      fail(res, 502, 'notion-api', `Notion API 오류 (${err.status})`)
      return
    }
    fail(res, 500, 'internal', '서버 오류')
  }
}
