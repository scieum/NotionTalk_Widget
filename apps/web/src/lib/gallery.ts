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
