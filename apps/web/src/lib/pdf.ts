import type { PDFDocumentProxy } from 'pdfjs-dist'

/**
 * PDF 미리보기 렌더링 — Notion 파일 속성의 서명 URL은 Content-Disposition:
 * attachment로 내려와 <iframe src>로는 표시되지 않는다(다운로드로 취급됨).
 * pdf.js로 바이트를 직접 읽어 캔버스에 그리면 이 문제를 우회할 수 있다.
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

export async function loadPdfDocument(url: string): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs()
  return pdfjs.getDocument({ url }).promise
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
