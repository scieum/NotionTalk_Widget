import { API_BASE } from './api'

/**
 * 갤러리 파일 목록 읽기 — 서버(api/notion/resource?resource=gallery)가 DB의 제목 + 파일과 미디어
 * 속성을 파일 단위로 펼쳐 통과시킨다(읽기 전용, Notion 역기록 없음).
 * 파일 URL은 서명돼 만료되므로 위젯이 열릴 때마다 새로 불러온다(캐시 금지).
 */

export interface GalleryItem {
  pageTitle: string
  fileName: string
  url: string
  kind: 'image' | 'pdf' | 'other'
  /** select/상태(단일) 또는 다중 선택 속성값 — select/상태는 항목 1개짜리 배열 */
  categories: string[]
  date: string | null
}

export type GallerySort = 'default' | 'title' | 'date-desc' | 'date-asc'

/** 카드 위에 노출할 분류 필터 옵션 — 등장 순서 유지, 중복 제거 */
export function galleryCategories(items: GalleryItem[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    for (const c of item.categories) {
      if (!seen.has(c)) {
        seen.add(c)
        out.push(c)
      }
    }
  }
  return out.sort((a, b) => a.localeCompare(b, 'ko'))
}

/** 분류 필터(빈 문자열 = 전체) + 정렬 적용. 정렬 기준 값이 없는 항목은 뒤로 보낸다. */
export function filterAndSortGallery(
  items: GalleryItem[],
  category: string,
  sort: GallerySort,
): GalleryItem[] {
  const filtered = category ? items.filter((item) => item.categories.includes(category)) : items
  if (sort === 'default') return filtered

  return filtered
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (sort === 'title') {
        return (
          a.item.pageTitle.localeCompare(b.item.pageTitle, 'ko') || a.index - b.index
        )
      }
      const da = a.item.date
      const db = b.item.date
      if (da === db) return a.index - b.index
      if (!da) return 1
      if (!db) return -1
      return sort === 'date-asc' ? (da < db ? -1 : 1) : da > db ? -1 : 1
    })
    .map((entry) => entry.item)
}

export type GalleryResult =
  | { ok: true; items: GalleryItem[] }
  | { ok: false; message: string }

export async function fetchGallery(dbId: string, wt: string): Promise<GalleryResult> {
  try {
    const params = new URLSearchParams({ resource: 'gallery', id: dbId })
    if (wt) params.set('wt', wt)
    const res = await fetch(`${API_BASE}/api/notion/resource?${params}`)
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean
      items?: GalleryItem[]
      message?: string
    } | null
    if (!body?.ok || !Array.isArray(body.items)) {
      return { ok: false, message: body?.message ?? '갤러리를 불러오지 못했어요.' }
    }
    return { ok: true, items: body.items }
  } catch {
    return { ok: false, message: '서버에 연결할 수 없어요.' }
  }
}
