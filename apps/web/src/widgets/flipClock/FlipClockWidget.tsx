import type { FlipClockConfig } from '@nwh/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNow } from '../../hooks/useNow'
import { useWidgetFont } from '../../hooks/useWidgetFont'
import type { WidgetProps } from '../types'

const SIZE_SCALE: Record<FlipClockConfig['size'], number> = {
  s: 0.7,
  m: 1,
  l: 1.3,
}

const FLIP_DURATION_MS = 380

export default function FlipClockWidget({
  config,
  layout,
}: WidgetProps<FlipClockConfig>) {
  const now = useNow(config.showSeconds ? 250 : 1000)
  const scale = layout === 'fullscreen' ? 1 : SIZE_SCALE[config.size]
  const fontStyle = useWidgetFont(config.font)

  const base = layout === 'fullscreen' ? 8.5 : 7
  const fontSize = `min(${base * scale}vw, ${base * 2.2 * scale}vh)`

  const h = now.getHours()
  const hours = config.hour12 ? (h % 12 === 0 ? 12 : h % 12) : h
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()

  return (
    <div className="flip-clock" style={fontStyle}>
      <div className="flip-clock__row" style={{ fontSize }}>
        <FlipGroup value={hours} />
        <span className="flip-clock__colon" aria-hidden>
          :
        </span>
        <FlipGroup value={minutes} />
        {config.showSeconds && (
          <>
            <span className="flip-clock__colon" aria-hidden>
              :
            </span>
            <FlipGroup value={seconds} />
          </>
        )}
      </div>
      {config.showDate && <DateLine now={now} layout={layout} scale={scale} />}
    </div>
  )
}

function FlipGroup({ value }: { value: number }) {
  const padded = String(value).padStart(2, '0')
  return (
    <div className="flip-clock__group">
      <FlipDigit value={Number(padded[0])} />
      <FlipDigit value={Number(padded[1])} />
    </div>
  )
}

function FlipDigit({ value }: { value: number }) {
  const prevRef = useRef(value)
  const [prev, setPrev] = useState(value)
  const [flipping, setFlipping] = useState(false)

  useEffect(() => {
    if (prevRef.current === value) return
    setPrev(prevRef.current)
    prevRef.current = value
    setFlipping(true)
    const timer = window.setTimeout(() => setFlipping(false), FLIP_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [value])

  return (
    <div className="flip-card">
      <div className="flip-half flip-half--top">
        <span className="flip-half__glyph">{value}</span>
      </div>
      <div className="flip-half flip-half--bottom">
        <span className="flip-half__glyph flip-half__glyph--bottom">{value}</span>
      </div>
      {flipping && (
        <>
          <div className="flip-leaf flip-leaf--top">
            <span className="flip-half__glyph">{prev}</span>
          </div>
          <div className="flip-leaf flip-leaf--bottom">
            <span className="flip-half__glyph flip-half__glyph--bottom">{value}</span>
          </div>
        </>
      )}
    </div>
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
