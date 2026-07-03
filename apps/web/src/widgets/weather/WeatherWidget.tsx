import type { WeatherConfig } from '@nwh/core'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useWidgetFont } from '../../hooks/useWidgetFont'
import type { WidgetProps } from '../types'

/** WMO weather code → 아이콘 + 한국어 라벨 */
function wmoInfo(code: number): { Icon: LucideIcon; label: string } {
  if (code === 0) return { Icon: Sun, label: '맑음' }
  if (code === 1 || code === 2) return { Icon: CloudSun, label: '구름 조금' }
  if (code === 3) return { Icon: Cloud, label: '흐림' }
  if (code === 45 || code === 48) return { Icon: CloudFog, label: '안개' }
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, label: '이슬비' }
  if (code >= 61 && code <= 67) return { Icon: CloudRain, label: '비' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { Icon: CloudSnow, label: '눈' }
  if (code >= 80 && code <= 82) return { Icon: CloudRainWind, label: '소나기' }
  if (code >= 95) return { Icon: CloudLightning, label: '뇌우' }
  return { Icon: Cloud, label: '흐림' }
}

interface WeatherData {
  current: {
    temp: number
    feels: number
    humidity: number
    wind: number
    code: number
  }
  daily: Array<{ date: string; code: number; max: number; min: number }>
  fetchedAt: number
}

const REFRESH_MS = 10 * 60 * 1000

function cacheKey(lat: number, lon: number, unit: string): string {
  return `nwh:weather:${lat.toFixed(4)},${lon.toFixed(4)},${unit}`
}

function loadCache(key: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as WeatherData
    if (typeof data?.current?.temp !== 'number') return null
    return data
  } catch {
    return null
  }
}

async function fetchWeather(
  lat: number,
  lon: number,
  unit: 'c' | 'f',
  signal: AbortSignal,
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    forecast_days: '7',
    timezone: 'auto',
    wind_speed_unit: 'ms',
  })
  if (unit === 'f') params.set('temperature_unit', 'fahrenheit')

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    { signal },
  )
  if (!res.ok) throw new Error(`weather http ${res.status}`)
  const body = (await res.json()) as {
    current?: {
      temperature_2m?: number
      relative_humidity_2m?: number
      apparent_temperature?: number
      weather_code?: number
      wind_speed_10m?: number
    }
    daily?: {
      time?: string[]
      weather_code?: number[]
      temperature_2m_max?: number[]
      temperature_2m_min?: number[]
    }
  }
  const cur = body.current
  if (!cur || typeof cur.temperature_2m !== 'number')
    throw new Error('weather bad payload')

  const time = body.daily?.time ?? []
  return {
    current: {
      temp: cur.temperature_2m,
      feels: cur.apparent_temperature ?? cur.temperature_2m,
      humidity: cur.relative_humidity_2m ?? 0,
      wind: cur.wind_speed_10m ?? 0,
      code: cur.weather_code ?? 3,
    },
    daily: time.map((date, i) => ({
      date,
      code: body.daily?.weather_code?.[i] ?? 3,
      max: body.daily?.temperature_2m_max?.[i] ?? 0,
      min: body.daily?.temperature_2m_min?.[i] ?? 0,
    })),
    fetchedAt: Date.now(),
  }
}

/** 날씨 데이터 — 캐시 즉시 표시 후 갱신, 실패 시 캐시 유지 + stale 표시 */
function useWeather(lat: number, lon: number, unit: 'c' | 'f') {
  const key = cacheKey(lat, lon, unit)
  const [data, setData] = useState<WeatherData | null>(() => loadCache(key))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setData(loadCache(key))
    setFailed(false)
    const controller = new AbortController()

    const load = async () => {
      // 일시 오류 흡수 — 2회 재시도(짧은 백오프)
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const fresh = await fetchWeather(lat, lon, unit, controller.signal)
          setData(fresh)
          setFailed(false)
          try {
            localStorage.setItem(key, JSON.stringify(fresh))
          } catch {
            /* 저장 실패는 무시 — 표시는 계속 */
          }
          return
        } catch {
          if (controller.signal.aborted) return
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
      if (!controller.signal.aborted) setFailed(true)
    }

    void load()
    const id = window.setInterval(() => void load(), REFRESH_MS)
    return () => {
      controller.abort()
      window.clearInterval(id)
    }
  }, [key, lat, lon, unit])

  return { data, failed }
}

export default function WeatherWidget({
  config,
  layout,
}: WidgetProps<WeatherConfig>) {
  const { data, failed } = useWeather(config.lat, config.lon, config.unit)
  const fontStyle = useWidgetFont(config.font)
  const fs = layout === 'fullscreen'

  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: 'short' }),
    [],
  )

  if (!data) {
    return (
      <div className="weather" style={fontStyle}>
        <div className="weather__status">
          {failed ? '날씨를 불러올 수 없어요' : '날씨 불러오는 중…'}
        </div>
      </div>
    )
  }

  const { Icon, label } = wmoInfo(data.current.code)
  const unitMark = config.unit === 'f' ? '°F' : '°'
  const forecast = data.daily.slice(0, config.forecastDays)

  return (
    <div
      className={`weather${fs ? ' weather--fullscreen' : ''}`}
      style={fontStyle}
    >
      <div className="weather__location">{config.locationName}</div>

      <div className="weather__now">
        <Icon className="weather__icon" aria-label={label} />
        <span className="weather__temp">
          {Math.round(data.current.temp)}
          {unitMark}
        </span>
      </div>

      <div className="weather__cond">
        {label}
        {config.showDetails && (
          <> · 체감 {Math.round(data.current.feels)}{unitMark}</>
        )}
      </div>

      {config.showDetails && (
        <div className="weather__details">
          <span>
            <Droplets aria-hidden /> {Math.round(data.current.humidity)}%
          </span>
          <span>
            <Wind aria-hidden /> {data.current.wind.toFixed(1)}m/s
          </span>
        </div>
      )}

      {forecast.length > 0 && (
        <div className="weather__forecast">
          {forecast.map((day, i) => {
            const info = wmoInfo(day.code)
            return (
              <div className="weather__day" key={day.date}>
                <span className="weather__day-name">
                  {i === 0 ? '오늘' : dayFormatter.format(new Date(day.date))}
                </span>
                <info.Icon className="weather__day-icon" aria-label={info.label} />
                <span className="weather__day-temp">
                  {Math.round(day.max)}° <em>{Math.round(day.min)}°</em>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {failed && <div className="weather__stale">오프라인 — 이전 데이터</div>}
    </div>
  )
}
