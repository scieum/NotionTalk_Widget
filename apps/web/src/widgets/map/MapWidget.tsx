import type { MapConfig } from '@nwh/core'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { useEffect, useRef, useState } from 'react'
import { API_BASE } from '../../lib/api'
import { geocodeAll, type LatLon } from '../../lib/geocode'
import type { WidgetProps } from '../types'

/**
 * 지도 위젯 — Notion 지도 DB 뷰의 한국 지원판.
 * DB의 제목+주소를 읽어 OSM 지도에 핀으로 표시. 주소→좌표는 클라이언트에서
 * 변환(캐시)하며, 주소가 서버에 저장되지 않는다.
 */

interface Place {
  name: string
  address: string
  category?: string
}

/** 카테고리 → 마커 색상 순환 팔레트 (해시로 카테고리별 고정 배정) */
const CATEGORY_COLORS = [
  'var(--accent-blue)',
  'var(--accent-teal)',
  'var(--accent-green)',
  'var(--accent-orange)',
  'var(--accent-pink)',
  'var(--accent-purple)',
]

function categoryColor(category: string): string {
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0
  }
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length]!
}

/** 마커 등장 애니메이션용 DOM(색상·이니셜 배지·순차 지연) — XSS 방지 위해 DOM으로 직접 조립 */
function buildPinElement(colorVar: string, initial: string | null, delayMs: number): HTMLElement {
  const el = document.createElement('span')
  el.className = 'map-pin'
  el.style.setProperty('--pin-color', colorVar)
  el.style.animationDelay = `${delayMs}ms`
  if (initial) {
    const badge = document.createElement('span')
    badge.className = 'map-pin__badge'
    badge.textContent = initial
    el.appendChild(badge)
  }
  return el
}

/** 타일 스타일 — 전부 키 불필요. Carto는 파스텔/미니멀, Esri는 위성. */
const TILE_STYLES: Record<
  MapConfig['style'],
  { url: string; attribution: string; subdomains?: string; maxZoom: number }
> = {
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  standard: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
}

type Status =
  | { kind: 'single' }
  | { kind: 'loading' }
  | { kind: 'geocoding'; done: number; total: number }
  | { kind: 'ready'; shown: number; failed: number }
  | { kind: 'error'; message: string }

export default function MapWidget({ config }: WidgetProps<MapConfig>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const [status, setStatus] = useState<Status>(
    config.dbId ? { kind: 'loading' } : { kind: 'single' },
  )

  // 지도 생성 (1회)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [config.lat, config.lon],
      zoom: config.zoom,
      zoomControl: true,
    })
    layerRef.current = L.layerGroup().addTo(map)
    clusterRef.current = L.markerClusterGroup({
      maxClusterRadius: 56,
      iconCreateFunction: (cluster) => {
        const el = document.createElement('span')
        el.className = 'map-cluster__count'
        el.textContent = String(cluster.getChildCount())
        return L.divIcon({ html: el, className: 'map-cluster', iconSize: L.point(36, 36) })
      },
    }).addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      clusterRef.current = null
      tileRef.current = null
    }
    // 생성은 1회 — 이후 변경은 아래 효과들이 setView/마커로 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 타일 스타일 적용/교체
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const style = TILE_STYLES[config.style]
    tileRef.current?.remove()
    tileRef.current = L.tileLayer(style.url, {
      maxZoom: style.maxZoom,
      attribution: style.attribution,
      ...(style.subdomains ? { subdomains: style.subdomains } : {}),
    }).addTo(map)
  }, [config.style])

  const accentColor = (): string => {
    const el = containerRef.current
    const v = el
      ? getComputedStyle(el).getPropertyValue(`--accent-${config.accent}`).trim()
      : ''
    return v || '#4a76a8'
  }

  /** 안전한 팝업/라벨 DOM (사용자 콘텐츠 이스케이프) */
  const popupEl = (name: string, address?: string, category?: string): HTMLElement => {
    const div = document.createElement('div')
    const strong = document.createElement('strong')
    strong.textContent = name
    div.appendChild(strong)
    if (category) {
      div.appendChild(document.createElement('br'))
      const tag = document.createElement('span')
      tag.style.opacity = '0.7'
      tag.textContent = category
      div.appendChild(tag)
    }
    if (address) {
      div.appendChild(document.createElement('br'))
      const span = document.createElement('span')
      span.textContent = address
      div.appendChild(span)
    }
    return div
  }

  const addMarker = (
    coords: LatLon,
    name: string,
    address: string | undefined,
    category: string | undefined,
    index: number,
    useCluster: boolean,
  ) => {
    const target = useCluster ? clusterRef.current : layerRef.current
    if (!target) return
    const colorVar = category ? categoryColor(category) : accentColor()
    const initial = category ? category.trim().charAt(0).toUpperCase() || null : null
    const icon = L.divIcon({
      html: buildPinElement(colorVar, initial, Math.min(index * 15, 300)),
      className: 'map-pin-icon',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    })
    const marker = L.marker(coords, { icon })
    marker.bindPopup(popupEl(name, address, category))
    if (config.showLabel) {
      const label = document.createElement('span')
      label.textContent = name
      marker.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -12] })
    }
    target.addLayer(marker)
  }

  // 마커 채우기 — 단일 위치 or DB 장소들
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    const cluster = clusterRef.current
    if (!map || !layer || !cluster) return
    let cancelled = false
    layer.clearLayers()
    cluster.clearLayers()

    if (!config.dbId) {
      setStatus({ kind: 'single' })
      addMarker([config.lat, config.lon], config.locationName, undefined, undefined, 0, false)
      map.setView([config.lat, config.lon], config.zoom)
      return
    }

    void (async () => {
      setStatus({ kind: 'loading' })
      try {
        const params = new URLSearchParams({ resource: 'places', id: config.dbId })
        if (config.wt) params.set('wt', config.wt)
        const res = await fetch(`${API_BASE}/api/notion/resource?${params}`)
        const body = (await res.json().catch(() => null)) as {
          ok?: boolean
          places?: Place[]
          message?: string
        } | null
        if (cancelled) return
        if (!body?.ok || !Array.isArray(body.places)) {
          setStatus({ kind: 'error', message: body?.message ?? '장소를 불러오지 못했어요.' })
          return
        }
        if (body.places.length === 0) {
          setStatus({ kind: 'error', message: 'DB에 주소가 있는 행이 없어요.' })
          return
        }

        setStatus({ kind: 'geocoding', done: 0, total: body.places.length })
        const coordsMap = await geocodeAll(
          body.places.map((p) => p.address),
          (done, total) => {
            if (!cancelled) setStatus({ kind: 'geocoding', done, total })
          },
        )
        if (cancelled) return

        const bounds: LatLon[] = []
        let failed = 0
        let shown = 0
        for (const place of body.places) {
          const coords = coordsMap.get(place.address.trim())
          if (!coords) {
            failed += 1
            continue
          }
          addMarker(coords, place.name, place.address, place.category, shown, true)
          bounds.push(coords)
          shown += 1
        }
        if (bounds.length === 0) {
          setStatus({ kind: 'error', message: '주소를 좌표로 변환하지 못했어요.' })
          return
        }
        if (bounds.length === 1) {
          map.setView(bounds[0]!, config.zoom)
        } else {
          map.fitBounds(L.latLngBounds(bounds), { padding: [32, 32] })
        }
        setStatus({ kind: 'ready', shown: bounds.length, failed })
      } catch {
        if (!cancelled) setStatus({ kind: 'error', message: '서버에 연결할 수 없어요.' })
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.dbId, config.wt, config.lat, config.lon, config.zoom, config.showLabel, config.locationName, config.accent])

  return (
    <div className="map-widget">
      <div ref={containerRef} className="map-widget__canvas" />
      {status.kind === 'loading' && <span className="map-widget__chip">장소 불러오는 중…</span>}
      {status.kind === 'geocoding' && (
        <span className="map-widget__chip">
          주소 변환 중 {status.done}/{status.total}
        </span>
      )}
      {status.kind === 'ready' && status.failed > 0 && (
        <span className="map-widget__chip">
          {status.shown}곳 표시 · {status.failed}건 주소 인식 실패
        </span>
      )}
      {status.kind === 'error' && (
        <span className="map-widget__chip map-widget__chip--error">{status.message}</span>
      )}
    </div>
  )
}
