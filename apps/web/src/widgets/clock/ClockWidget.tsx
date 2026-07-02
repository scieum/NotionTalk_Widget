import { ACCENT_CSS_VAR, type ClockConfig } from '@nwh/core'
import { useMemo } from 'react'
import { useNow } from '../../hooks/useNow'
import type { WidgetProps } from '../types'

const SIZE_SCALE: Record<ClockConfig['size'], number> = {
  s: 0.7,
  m: 1,
  l: 1.3,
}

export default function ClockWidget({
  config,
  layout,
}: WidgetProps<ClockConfig>) {
  const now = useNow(config.showSeconds ? 250 : 1000)
  const accent = ACCENT_CSS_VAR[config.accent]
  // 전체화면은 프로젝터용 — size 설정을 무시하고 항상 최대
  const scale = layout === 'fullscreen' ? 1 : SIZE_SCALE[config.size]

  return (
    <div className="clock">
      {config.mode === 'digital' ? (
        <DigitalClock now={now} config={config} layout={layout} scale={scale} accent={accent} />
      ) : (
        <div className="dial-wrap" style={{ maxHeight: `${86 * scale}%` }}>
          <AnalogClock now={now} config={config} layout={layout} scale={scale} accent={accent} />
        </div>
      )}
      {config.showDate && (
        <DateLine now={now} layout={layout} scale={scale} />
      )}
    </div>
  )
}

interface PartProps {
  now: Date
  config: ClockConfig
  layout: 'embed' | 'fullscreen'
  scale: number
  accent: string
}

function DigitalClock({ now, config, layout, scale }: PartProps) {
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        ...(config.showSeconds ? { second: '2-digit' as const } : {}),
        hour12: config.hour12,
      }),
    [config.showSeconds, config.hour12],
  )

  const base = layout === 'fullscreen' ? 15 : 13
  const fontSize = `min(${base * scale}vw, ${base * 2.2 * scale}vh)`

  return (
    <div className="clock__time" style={{ fontSize }}>
      {formatter.format(now)}
    </div>
  )
}

function AnalogClock({ now, config, accent }: PartProps) {
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000
  const minutes = now.getMinutes() + seconds / 60
  const hours = (now.getHours() % 12) + minutes / 60

  return (
    <svg
      viewBox="0 0 200 200"
      style={{ width: '100%', height: '100%' }}
      role="img"
      aria-label="아날로그 시계"
    >
      <circle
        cx="100"
        cy="100"
        r="97"
        fill="var(--bg)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="100"
          y1="10"
          x2="100"
          y2={i % 3 === 0 ? '22' : '17'}
          stroke={i % 3 === 0 ? 'var(--fg)' : 'var(--fg-muted)'}
          strokeWidth={i % 3 === 0 ? 4 : 2}
          strokeLinecap="round"
          transform={`rotate(${i * 30} 100 100)`}
        />
      ))}
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="56"
        stroke="var(--fg)"
        strokeWidth="7"
        strokeLinecap="round"
        transform={`rotate(${hours * 30} 100 100)`}
      />
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="34"
        stroke="var(--fg)"
        strokeWidth="4.5"
        strokeLinecap="round"
        transform={`rotate(${minutes * 6} 100 100)`}
      />
      {config.showSeconds && (
        <line
          x1="100"
          y1="112"
          x2="100"
          y2="28"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${seconds * 6} 100 100)`}
        />
      )}
      <circle cx="100" cy="100" r="6" fill="var(--fg)" />
      <circle cx="100" cy="100" r="3" fill={accent} />
    </svg>
  )
}

function DateLine({
  now,
  layout,
  scale,
}: {
  now: Date
  layout: 'embed' | 'fullscreen'
  scale: number
}) {
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }),
    [],
  )
  const base = layout === 'fullscreen' ? 3 : 4
  const fontSize = `max(12px, min(${base * scale}vw, ${base * 2.4 * scale}vh))`

  return (
    <div className="clock__date" style={{ fontSize }}>
      {formatter.format(now)}
    </div>
  )
}
