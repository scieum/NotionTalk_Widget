import type { WeatherConfig } from '@nwh/core'
import { useState } from 'react'
import CommonFields from '../../components/CommonFields'
import FontSelect from '../../components/FontSelect'
import type { SettingsFormProps } from '../types'

interface GeoResult {
  name: string
  admin1?: string
  country?: string
  latitude: number
  longitude: number
}

/** 도시 검색 — Open-Meteo 지오코딩(키 불필요), 한국어 우선 */
async function searchCity(query: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    name: query,
    count: '6',
    language: 'ko',
    format: 'json',
  })
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
  )
  if (!res.ok) throw new Error(`geocoding http ${res.status}`)
  const body = (await res.json()) as { results?: GeoResult[] }
  return (body.results ?? []).filter(
    (r) =>
      typeof r.latitude === 'number' &&
      typeof r.longitude === 'number' &&
      typeof r.name === 'string',
  )
}

export default function WeatherSettings({
  config,
  onChange,
}: SettingsFormProps<WeatherConfig>) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const set = <K extends keyof WeatherConfig>(
    key: K,
    value: WeatherConfig[K],
  ) => onChange({ ...config, [key]: value })

  const runSearch = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearchError(null)
    try {
      const found = await searchCity(q)
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
      locationName: r.name.slice(0, 60),
      lat: Math.round(r.latitude * 10000) / 10000,
      lon: Math.round(r.longitude * 10000) / 10000,
    })
    setResults(null)
    setQuery('')
  }

  return (
    <>
      <label className="field">
        위치
        <input
          type="text"
          placeholder={`현재: ${config.locationName} — 도시 이름으로 검색`}
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
        {searching ? '검색 중…' : '도시 검색'}
      </button>

      {results && results.length > 0 && (
        <div className="weather-geo-results">
          {results.map((r) => (
            <button
              type="button"
              key={`${r.latitude},${r.longitude}`}
              className="btn btn--sm btn--ghost"
              onClick={() => pick(r)}
            >
              {r.name}
              {r.admin1 ? ` · ${r.admin1}` : ''}
              {r.country ? ` (${r.country})` : ''}
            </button>
          ))}
        </div>
      )}
      {searchError && (
        <p className="tool__hint" style={{ textAlign: 'left' }}>
          {searchError}
        </p>
      )}

      <label className="field">
        온도 단위
        <select
          value={config.unit}
          onChange={(e) => set('unit', e.target.value as WeatherConfig['unit'])}
        >
          <option value="c">섭씨 (°C)</option>
          <option value="f">화씨 (°F)</option>
        </select>
      </label>

      <label className="field">
        예보 일수
        <select
          value={String(config.forecastDays)}
          onChange={(e) => set('forecastDays', Number(e.target.value))}
        >
          <option value="0">현재만</option>
          <option value="3">3일</option>
          <option value="5">5일</option>
          <option value="7">7일</option>
        </select>
      </label>

      <label className="field">
        상세 (습도·바람·체감)
        <input
          type="checkbox"
          checked={config.showDetails}
          onChange={(e) => set('showDetails', e.target.checked)}
        />
      </label>

      <FontSelect value={config.font} onChange={(font) => set('font', font)} />

      <CommonFields config={config} onChange={onChange} />
    </>
  )
}
