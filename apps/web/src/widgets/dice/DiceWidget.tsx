import { ACCENT_CSS_VAR, type DiceConfig } from '@nwh/core'
import { Dices } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { WidgetProps } from '../types'

/** 주사위 — 명단 불필요, 클라이언트 완결 */
export default function DiceWidget({ config, layout }: WidgetProps<DiceConfig>) {
  const [values, setValues] = useState<number[]>(() =>
    Array.from({ length: config.count }, () => config.sides),
  )
  const [rolling, setRolling] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  // 개수/면 수 변경 시 표시 초기화
  useEffect(() => {
    setValues(Array.from({ length: config.count }, () => config.sides))
  }, [config.count, config.sides])

  const roll = () => {
    if (rolling) return
    setRolling(true)
    const rollOnce = () =>
      Array.from({ length: config.count }, () => 1 + Math.floor(Math.random() * config.sides))

    // 빠른 셔플 → 점점 느려지며 정착
    const steps = [70, 70, 90, 90, 110, 140, 180, 240]
    let elapsed = 0
    for (const [i, delay] of steps.entries()) {
      elapsed += delay
      timers.current.push(
        window.setTimeout(() => {
          setValues(rollOnce())
          if (i === steps.length - 1) setRolling(false)
        }, elapsed),
      )
    }
  }

  const accent = ACCENT_CSS_VAR[config.accent]
  const fs = layout === 'fullscreen'
  const total = values.reduce((a, b) => a + b, 0)
  const dieSize = fs
    ? `min(${config.count > 1 ? 24 : 34}vmin, 38vh)`
    : `min(${config.count > 1 ? 26 : 40}vmin, 44vh)`

  return (
    <div className={`tool${fs ? ' tool--fullscreen' : ''}`}>
      <div className="dice-row">
        {values.map((v, i) => (
          <Die key={i} value={v} sides={config.sides} size={dieSize} rolling={rolling} accent={accent} />
        ))}
      </div>

      {config.showTotal && config.count > 1 && (
        <div
          className="dice-total"
          style={{ fontSize: fs ? 'min(6vw, 8vh)' : 'min(7vw, 9vh)' }}
        >
          합 {rolling ? '?' : total}
        </div>
      )}

      <div className="tool__controls">
        <button type="button" className="btn" onClick={roll} disabled={rolling}>
          <Dices size={16} aria-hidden />
          굴리기
        </button>
      </div>
    </div>
  )
}

/** 6면은 눈(pip), 그 외는 숫자 */
function Die({
  value,
  sides,
  size,
  rolling,
  accent,
}: {
  value: number
  sides: number
  size: string
  rolling: boolean
  accent: string
}) {
  return (
    <div
      className={`die${rolling ? ' die--rolling' : ''}`}
      style={{ width: size, height: size }}
      aria-label={`주사위 ${value}`}
    >
      {sides === 6 ? (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          <rect x="4" y="4" width="92" height="92" rx="18" fill="var(--dial-face, var(--bg))" stroke="var(--border)" strokeWidth="3" />
          {PIPS[value]?.map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="9" fill={accent} />
          ))}
        </svg>
      ) : (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          <rect x="4" y="4" width="92" height="92" rx="18" fill="var(--dial-face, var(--bg))" stroke="var(--border)" strokeWidth="3" />
          <text
            x="50"
            y="52"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="44"
            fontWeight="700"
            fill={accent}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </text>
          <text x="78" y="86" textAnchor="middle" fontSize="14" fill="var(--fg-muted)">
            d{sides}
          </text>
        </svg>
      )}
    </div>
  )
}

/** 6면 주사위 눈 좌표 */
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]],
}
