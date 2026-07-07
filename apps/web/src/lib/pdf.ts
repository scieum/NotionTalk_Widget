import type { PDFDocumentProxy } from 'pdfjs-dist'
import { API_BASE } from './api'

/**
 * PDF 미리보기 렌더링 — Notion 파일 속성의 서명 URL은 두 가지 이유로 브라우저에서
 * 직접 표시할 수 없다:
 * 1) Content-Disposition: attachment → <iframe src> 는 다운로드로 취급
 * 2) CORS 헤더 없음 → pdf.js(fetch)가 바이트를 읽지 못함 (<img>만 CORS 예외라 이미지는 됐음)
 * 그래서 Notion 호스트 파일은 서버 프록시(api/notion/resource?resource=file)를 거쳐
 * 바이트를 받고, 외부(external) URL은 직접 fetch를 시도한다(해당 호스트가 CORS를
 * 허용하면 표시, 아니면 폴백 UI).
 */

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([mod, worker]) => {
      mod.GlobalWorkerOptions.workerSrc = worker.default
      return mod
    })
  }
  return pdfjsPromise
}

/** 서버 프록시의 허용 목록(api/notion/resource.ts isNotionFileHost)과 동일해야 한다 */
function isNotionFileHost(url: string): boolean {
  try {
    const u = new URL(url)
    return (
      u.protocol === 'https:' &&
      (u.hostname === 'file.notion.so' ||
        u.hostname === 'www.notion.so' ||
        u.hostname.endsWith('.notionusercontent.com') ||
        /^prod-files-secure\.s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(u.hostname) ||
        /^s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(u.hostname))
    )
  } catch {
    return false
  }
}

/** 카드 썸네일과 라이트박스가 같은 PDF를 두 번 내려받지 않도록 세션 내 캐시 */
const docCache = new Map<string, Promise<PDFDocumentProxy>>()

export function loadPdfDocument(url: string): Promise<PDFDocumentProxy> {
  const cached = docCache.get(url)
  if (cached) return cached

  const promise = (async () => {
    const pdfjs = await loadPdfjs()
    const target = isNotionFileHost(url)
      ? `${API_BASE}/api/notion/resource?resource=file&url=${encodeURIComponent(url)}`
      : url
    const res = await fetch(target)
    if (!res.ok) throw new Error(`pdf fetch failed: ${res.status}`)
    const data = await res.arrayBuffer()
    return pdfjs.getDocument({ data }).promise
  })()

  // 실패한 로드는 캐시에서 제거 — 다시 열면 재시도
  promise.catch(() => docCache.delete(url))
  docCache.set(url, promise)
  return promise
}

export async function renderPdfPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  maxWidth: number,
): Promise<void> {
  const page = await doc.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const scale = maxWidth / base.width
  const viewport = page.getViewport({ scale })
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvas, viewport }).promise
}
