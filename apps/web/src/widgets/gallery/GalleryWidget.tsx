import type { GalleryConfig } from '@nwh/core'
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Images, X } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'
import {
  fetchGallery,
  filterAndSortGallery,
  galleryCategories,
  type GalleryItem,
  type GallerySort,
} from '../../lib/gallery'
import { loadPdfDocument, renderPdfPage } from '../../lib/pdf'
import type { WidgetProps } from '../types'

type Load =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; items: GalleryItem[] }
  | { kind: 'error'; message: string }

export default function GalleryWidget({ config, layout }: WidgetProps<GalleryConfig>) {
  const [load, setLoad] = useState<Load>(config.dbId ? { kind: 'loading' } : { kind: 'idle' })
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [sort, setSort] = useState<GallerySort>(config.sort)

  useEffect(() => {
    if (!config.dbId) {
      setLoad({ kind: 'idle' })
      return
    }
    let cancelled = false
    setLoad({ kind: 'loading' })
    setFilterCategory('')
    setSort(config.sort)
    void fetchGallery(config.dbId, config.wt).then((r) => {
      if (cancelled) return
      setLoad(r.ok ? { kind: 'ready', items: r.items } : { kind: 'error', message: r.message })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.dbId, config.wt])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  const gridStyle =
    config.columns === 'auto'
      ? undefined
      : { gridTemplateColumns: `repeat(${config.columns}, 1fr)` }

  const categories = load.kind === 'ready' ? galleryCategories(load.items) : []
  const visibleItems =
    load.kind === 'ready' ? filterAndSortGallery(load.items, filterCategory, sort) : []

  return (
    <div className={`tool${layout === 'fullscreen' ? ' tool--fullscreen' : ''}`}>
      <div className="gallery">
        {load.kind === 'idle' && (
          <p className="todo__empty">
            설정에서 Notion 갤러리 DB를 연결하면 파일이 여기에 표시돼요.
          </p>
        )}
        {load.kind === 'loading' && <p className="todo__empty">갤러리 불러오는 중…</p>}
        {load.kind === 'error' && <p className="todo__empty">{load.message}</p>}
        {load.kind === 'ready' && load.items.length === 0 && (
          <p className="todo__empty">표시할 파일이 없어요.</p>
        )}

        {load.kind === 'ready' && load.items.length > 0 && (
          <>
            <div className="gallery__toolbar">
              {categories.length > 0 && (
                <label className="gallery__toolbar-field">
                  분류
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">전체</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="gallery__toolbar-field">
                정렬
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as GallerySort)}
                >
                  <option value="default">기본</option>
                  <option value="title">이름순</option>
                  <option value="date-desc">최신순</option>
                  <option value="date-asc">오래된순</option>
                </select>
              </label>
            </div>

            {visibleItems.length === 0 && (
              <p className="todo__empty">조건에 맞는 파일이 없어요.</p>
            )}

            {visibleItems.length > 0 && (
              <div className="gallery__grid" style={gridStyle}>
                {visibleItems.map((item, i) => (
                  <GalleryCard
                    key={`${item.url}-${i}`}
                    item={item}
                    showCaption={config.showCaption}
                    onOpen={() =>
                      (item.kind === 'image' || item.kind === 'pdf') && setLightbox(item)
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && (
        <div className="gallery-lightbox" onClick={() => setLightbox(null)}>
          <button
            type="button"
            className="gallery-lightbox__close"
            aria-label="닫기"
            onClick={() => setLightbox(null)}
          >
            <X aria-hidden />
          </button>
          {lightbox.kind === 'image' && (
            <img
              src={lightbox.url}
              alt={lightbox.fileName}
              className="gallery-lightbox__img"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {lightbox.kind === 'pdf' && (
            <PdfLightboxViewer item={lightbox} onStopPropagation={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  )
}

function GalleryCard({
  item,
  showCaption,
  onOpen,
}: {
  item: GalleryItem
  showCaption: boolean
  onOpen: () => void
}) {
  const [pdfFailed, setPdfFailed] = useState(false)

  return (
    <figure className="gallery-card">
      {item.kind === 'image' && (
        <button type="button" className="gallery-card__frame" onClick={onOpen}>
          <img src={item.url} alt={item.fileName} loading="lazy" />
        </button>
      )}
      {item.kind === 'pdf' && (
        <button
          type="button"
          className={`gallery-card__frame${pdfFailed ? ' gallery-card__frame--file' : ''}`}
          onClick={onOpen}
        >
          {pdfFailed ? (
            <>
              <FileText size={28} aria-hidden />
              <span className="gallery-card__filetype">PDF</span>
            </>
          ) : (
            <PdfThumbnail url={item.url} onError={() => setPdfFailed(true)} />
          )}
        </button>
      )}
      {item.kind === 'other' && (
        <a
          className="gallery-card__frame gallery-card__frame--file"
          href={item.url}
          target="_blank"
          rel="noreferrer"
        >
          <FileText size={28} aria-hidden />
        </a>
      )}
      {showCaption && (
        <figcaption className="gallery-card__caption">
          <Images size={12} aria-hidden />
          <span>{item.pageTitle}</span>
        </figcaption>
      )}
    </figure>
  )
}

function PdfThumbnail({ url, onError }: { url: string; onError: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const doc = await loadPdfDocument(url)
        if (cancelled) return
        const canvas = canvasRef.current
        if (!canvas) return
        await renderPdfPage(doc, 1, canvas, 320)
      } catch {
        if (!cancelled) onError()
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  return <canvas ref={canvasRef} className="gallery-card__pdf-canvas" />
}

function PdfLightboxViewer({
  item,
  onStopPropagation,
}: {
  item: GalleryItem
  onStopPropagation: (e: React.MouseEvent) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const docRef = useRef<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    docRef.current = null
    setFailed(false)
    setPage(1)
    setNumPages(null)
    void (async () => {
      try {
        const doc = await loadPdfDocument(item.url)
        if (cancelled) return
        docRef.current = doc
        setNumPages(doc.numPages)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [item.url])

  useEffect(() => {
    const doc = docRef.current
    const canvas = canvasRef.current
    if (!doc || !numPages || !canvas) return
    let cancelled = false
    void renderPdfPage(doc, page, canvas, 900).catch(() => {
      if (!cancelled) setFailed(true)
    })
    return () => {
      cancelled = true
    }
  }, [page, numPages])

  if (failed) {
    return (
      <div className="gallery-lightbox__pdf-fallback" onClick={onStopPropagation}>
        <FileText size={40} aria-hidden />
        <p>PDF 미리보기를 표시할 수 없어요.</p>
        <a href={item.url} target="_blank" rel="noreferrer">
          <ExternalLink size={14} aria-hidden />
          새 탭에서 열기
        </a>
      </div>
    )
  }

  return (
    <div className="gallery-lightbox__pdf" onClick={onStopPropagation}>
      <canvas ref={canvasRef} className="gallery-lightbox__pdf-canvas" />
      {numPages !== null && numPages > 1 && (
        <div className="gallery-lightbox__pdf-nav">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="이전 페이지"
          >
            <ChevronLeft aria-hidden />
          </button>
          <span>
            {page} / {numPages}
          </span>
          <button
            type="button"
            disabled={page >= numPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="다음 페이지"
          >
            <ChevronRight aria-hidden />
          </button>
        </div>
      )}
      <a className="gallery-lightbox__pdf-open" href={item.url} target="_blank" rel="noreferrer">
        <ExternalLink size={14} aria-hidden />
        새 탭에서 열기
      </a>
    </div>
  )
}
