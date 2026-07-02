import { ACCENT_CSS_VAR, type ClassTimerConfig } from '@nwh/core'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { beep } from '../../lib/beep'
import type { WidgetProps } from '../types'

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export default function ClassTimerWidget({
  config,
  layout,
}: WidgetProps<ClassTimerConfig>) {
  const firstPreset = config.presets[0] ?? 5
  const [durationSec, setDurationSec] = useState(firstPreset * 60)
  const [remainMs, setRemainMs] = useState(firstPreset * 60_000)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [flashing, setFlashing] = useState(false)
  const flashTimer = useRef<number>()

  const running = endsAt !== null
  const accent = ACCENT_CSS_VAR[config.accent]

  // 카운트다운 — 항상 종료 시각(타임스탬프) 기준
  useEffect(() => {
    if (endsAt === null) return
    const id = window.setInterval(() => {
      const rem = endsAt - Date.now()
      if (rem <= 0) {
        setRemainMs(0)
        setEndsAt(null)
        if (config.sound) beep(3)
        if (config.flash) {
          setFlashing(true)
          window.clearTimeout(flashTimer.current)
          flashTimer.current = window.setTimeout(() => setFlashing(false), 1300)
        }
      } else {
        setRemainMs(rem)
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [endsAt, config.sound, config.flash])

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  const selectDuration = (min: number) => {
    setEndsAt(null)
    setDurationSec(min * 60)
    setRemainMs(min * 60_000)
  }

  const toggle = () => {
    if (running) {
      setRemainMs(Math.max(0, endsAt - Date.now()))
      setEndsAt(null)
    } else {
      const base = remainMs > 0 ? remainMs : durationSec * 1000
      setRemainMs(base)
      setEndsAt(Date.now() + base)
    }
  }

  const resetTimer = () => {
    setEndsAt(null)
    setRemainMs(durationSec * 1000)
  }

  const timeFontSize =
    layout === 'fullscreen' ? 'min(24vw, 44vh)' : 'min(18vw, 34vh)'
  const ended = remainMs <= 0

  return (
    <div className={`tool${layout === 'fullscreen' ? ' tool--fullscreen' : ''}`}>
      <div className={`flash-overlay${flashing ? ' flash-overlay--on' : ''}`} />

      <div className="tool__controls">
        {config.presets.map((min) => (
          <button
            key={min}
            type="button"
            className={`chip${durationSec === min * 60 ? ' chip--active' : ''}`}
            onClick={() => selectDuration(min)}
          >
            {min}분
          </button>
        ))}
        <input
          type="number"
          min={1}
          max={180}
          aria-label="직접 입력 (분)"
          placeholder="직접"
          style={{
            width: 56,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-pill)',
            background: 'transparent',
            color: 'var(--fg)',
            fontSize: 13,
            padding: '3px 10px',
            textAlign: 'center',
          }}
          onChange={(e) => {
            const min = Math.min(180, Math.max(1, Math.floor(Number(e.target.value))))
            if (Number.isFinite(min) && min >= 1) selectDuration(min)
          }}
        />
      </div>

      <div
        className="tool__time"
        style={{
          fontSize: timeFontSize,
          color: ended ? accent : undefined,
        }}
      >
        {formatMs(remainMs)}
      </div>

      <div className="tool__controls">
        <button type="button" className="btn" onClick={toggle} disabled={ended && !running}>
          {running ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
          {running ? '일시정지' : '시작'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={resetTimer}>
          <RotateCcw size={16} aria-hidden />
          리셋
        </button>
      </div>
      {ended && <span className="tool__hint">시간 종료</span>}
    </div>
  )
}
