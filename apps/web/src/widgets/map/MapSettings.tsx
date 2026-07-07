import type { MapConfig } from '@nwh/core'
import { Database } from 'lucide-react'
import { useState } from 'react'
import CommonFields from '../../components/CommonFields'
import { NotionDbModal } from '../../components/NotionDbPicker'
import { searchPlace, type GeoResult } from '../../lib/geocode'
import type { SettingsFormProps } from '../types'

export default function MapSettings({
  config,
  onChange,
}: SettingsFormProps<MapConfig>) {
  const [dbOpen, setDbOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const runSearch = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearchError(null)
    try {
      const found = await searchPlace(q)
      setResults(found)
      if (found.length === 0) setSearchError('검색 결과가 없어요.')
    } catch {
      setResults(null)
      setSearchError('검색에 실패했어요. 잠시 후 다시 시도하세요.')
    } finally {
      setSearching(false)
    }
  }

  const pick = (r: GeoResult) => {
    onChange({
      ...config,
      locationName: r.name.split(',')[0]!.trim().slice(0, 80),
      lat: Math.round(r.lat * 10000) / 10000,
      lon: Math.round(r.lon * 10000) / 10000,
    })
    setResults(null)
    setQuery('')
  }

  return (
    <>
      <label className="field">
        장소 DB
        <button type="button" className="db-connect" onClick={() => setDbOpen(true)}>
          <Database aria-hidden />
          <span className="db-connect__name">
            {config.dbId ? `ID ${config.dbId.slice(0, 8)}…` : '연결 안 함 (단일 위치)'}
          </span>
          <span className="db-connect__action">{config.dbId ? '변경' : '연결'}</span>
        </button>
      </label>
      {config.dbId && (
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() => onChange({ ...config, dbId: '', wt: '' })}
        >
          DB 연결 해제 (단일 위치 모드로)
        </button>
      )}
      <p className="tool__hint" style={{ textAlign: 'left' }}>
        DB의 제목 + "주소" 텍스트 속성을 읽어 지도에 핀으로 표시합니다. 분류(select/status)
        속성이 있으면 카테고리별로 마커 색을 자동으로 구분하고, 핀이 많으면 자동으로 묶어(클러스터링)
        표시해요.
      </p>

      {!config.dbId && (
        <>
          <label className="field">
            중심 위치
            <input
              type="text"
              placeholder={`현재: ${config.locationName} — 주소/장소 검색`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void runSearch()
                }
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            disabled={searching || !query.trim()}
            onClick={() => void runSearch()}
          >
            {searching ? '검색 중…' : '장소 검색'}
          </button>
          {results && results.length > 0 && (
            <div className="weather-geo-results">
              {results.map((r) => (
                <button
                  type="button"
                  key={`${r.lat},${r.lon}`}
                  className="btn btn--sm btn--ghost"
                  onClick={() => pick(r)}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
          {searchError && (
            <p className="tool__hint" style={{ textAlign: 'left' }}>
              {searchError}
            </p>
          )}
        </>
      )}

      <label className="field">
        지도 스타일
        <select
          value={config.style}
          onChange={(e) =>
            onChange({ ...config, style: e.target.value as MapConfig['style'] })
          }
        >
          <option value="voyager">보이저 (파스텔)</option>
          <option value="light">라이트 (미니멀)</option>
          <option value="dark">다크</option>
          <option value="standard">표준 (OSM)</option>
          <option value="satellite">위성</option>
        </select>
      </label>

      <label className="field">
        확대 수준
        <select
          value={String(config.zoom)}
          onChange={(e) => onChange({ ...config, zoom: Number(e.target.value) })}
        >
          <option value="7">광역 (도)</option>
          <option value="10">도시</option>
          <option value="13">지역</option>
          <option value="15">동네</option>
          <option value="17">거리</option>
        </select>
      </label>

      <label className="field">
        이름 라벨 상시 표시
        <input
          type="checkbox"
          checked={config.showLabel}
          onChange={(e) => onChange({ ...config, showLabel: e.target.checked })}
        />
      </label>

      <CommonFields config={config} onChange={onChange} />

      {dbOpen && (
        <NotionDbModal
          purpose="places"
          value={config.dbId}
          onSelect={({ dbId, wt }) => onChange({ ...config, dbId, wt })}
          onClose={() => setDbOpen(false)}
        />
      )}
    </>
  )
}
