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
 * 장소 목록 — 지도 위젯용. DB의 제목(title) + 주소(rich_text) 속성을 읽는다.
 * Notion 지도 DB 뷰의 대체이므로 주소 내용은 응답으로 통과만 하고
 * 서버에 저장·캐시·로그하지 않는다. 좌표 변환(지오코딩)은 클라이언트 몫.
 */

/** 주소 속성 이름 후보 (타입 rich_text) */
const ADDRESS_CANDIDATES = ['주소', '위치', '장소', 'address', 'location', 'place']
/** 카테고리 속성 이름 후보 (타입 select/status) — 지도 마커 색상/배지 구분용 */
const CATEGORY_CANDIDATES = ['분류', '카테고리', '종류', 'category', 'type']

const norm = (s: string) => s.trim().toLowerCase()

interface PageProps {
  properties?: Record<
    string,
    {
      type?: string
      title?: { plain_text?: string }[]
      rich_text?: { plain_text?: string }[]
      select?: { name?: string } | null
      status?: { name?: string } | null
    }
  >
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
    // 주소 속성 결정 — 이름 후보 우선, 없으면 유일한 rich_text 속성
    const database = (await getDatabase(auth.token, dbId)) as {
      properties?: Record<string, { type?: string }>
    }
    const propEntries = Object.entries(database.properties ?? {})
    const richTextProps = propEntries
      .filter(([, p]) => p.type === 'rich_text')
      .map(([name]) => name)
    const addressProp =
      richTextProps.find((name) =>
        ADDRESS_CANDIDATES.includes(name.trim().toLowerCase()),
      ) ?? (richTextProps.length === 1 ? richTextProps[0] : null)
    if (!addressProp) {
      fail(
        res,
        422,
        'mapping-failed',
        'DB에서 주소 속성을 찾지 못했습니다. 텍스트 속성 이름을 "주소"로 해주세요.',
      )
      return
    }

    // 카테고리 속성(select/status)은 없어도 그만 — 있으면 마커 색상/배지 구분에 사용
    const categoryProp =
      propEntries
        .filter(([, p]) => p.type === 'select' || p.type === 'status')
        .map(([name]) => name)
        .find((name) => CATEGORY_CANDIDATES.includes(norm(name))) ?? null

    const places: { name: string; address: string; category?: string }[] = []
    let cursor: string | undefined
    for (let page = 0; page < 2; page++) {
      const result = (await queryDatabase(auth.token, dbId, {
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })) as { results?: PageProps[]; has_more?: boolean; next_cursor?: string }

      for (const row of result.results ?? []) {
        const props = Object.entries(row.properties ?? {})
        const title = props.find(([, p]) => p.type === 'title')?.[1]
        const name = title?.title?.map((t) => t.plain_text ?? '').join('').trim()
        const address = row.properties?.[addressProp]?.rich_text
          ?.map((t) => t.plain_text ?? '')
          .join('')
          .trim()
        if (!address) continue
        const categoryValue = categoryProp
          ? (row.properties?.[categoryProp]?.select?.name ??
            row.properties?.[categoryProp]?.status?.name ??
            undefined)
          : undefined
        places.push({
          name: name || address,
          address,
          ...(categoryValue ? { category: categoryValue } : {}),
        })
      }
      if (!result.has_more || !result.next_cursor) break
      cursor = result.next_cursor
    }

    res.status(200).json({
      ok: true,
      places,
      database: summarizeDatabase(database),
      addressProp,
      categoryProp,
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
