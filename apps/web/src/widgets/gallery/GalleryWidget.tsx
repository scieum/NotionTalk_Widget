import type { GalleryConfig } from '@nwh/core'
import { FileText, Images, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchGallery, type GalleryItem } from '../../lib/gallery'
import type { WidgetProps } from '../types'

type Load =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; items: GalleryItem[] }
  | { kind: 'error'; message: string }

export default function GalleryWidget({ config, layout }: WidgetProps<GalleryConfig>) {
  const [load, setLoad] = useState<Load>(config.dbId ? { kind: 'loading' } : { kind: 'idle' })
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null)

  useEffect(() => {
    if (!config.dbId) {
      setLoad({ kind: 'idle' })
      return
    }
    let cancelled = false
    setLoad({ kind: 'loading' })
    void fetchGallery(config.dbId, config.wt).then((r) => {
      if (cancelled) return
      setLoad(r.ok ? { kind: 'ready', items: r.items } : { kind: 'error', message: r.message })
    })
    return () => {
      cancelled = true
    }
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
          <div className="gallery__grid" style={gridStyle}>
            {load.items.map((item, i) => (
              <GalleryCard
                key={`${item.url}-${i}`}
                item={item}
                showCaption={config.showCaption}
                onOpen={() => item.kind === 'image' && setLightbox(item)}
              />
            ))}
          </div>
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
          <img
            src={lightbox.url}
            alt={lightbox.fileName}
            className="gallery-lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />
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
  return (
    <figure className="gallery-card">
      {item.kind === 'image' && (
        <button type="button" className="gallery-card__frame" onClick={onOpen}>
          <img src={item.url} alt={item.fileName} loading="lazy" />
        </button>
      )}
      {item.kind === 'pdf' && (
        <div className="gallery-card__frame gallery-card__frame--pdf">
          <iframe title={item.fileName} src={item.url} />
          <a
            className="gallery-card__fallback"
            href={item.url}
            target="_blank"
            rel="noreferrer"
          >
            새 탭에서 열기
          </a>
        </div>
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
