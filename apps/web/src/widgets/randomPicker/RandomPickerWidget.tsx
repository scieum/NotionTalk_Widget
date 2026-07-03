import {
  ACCENT_CSS_VAR,
  drawStudents,
  hashSeed,
  type RandomPickerConfig,
} from '@nwh/core'
import { Dices, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import RosterPanel from '../../components/RosterPanel'
import type { RosterPreset } from '../../lib/roster'
import type { WidgetProps } from '../types'

type ClawPhase = 'idle' | 'down' | 'up' | 'open'

export default function RandomPickerWidget({
  config,
  layout,
}: WidgetProps<RandomPickerConfig>) {
  const [roster, setRoster] = useState<RosterPreset | null>(null)
  const [pickedAll, setPickedAll] = useState<string[]>([])
  const [current, setCurrent] = useState<string[] | null>(null)
  const [rolling, setRolling] = useState(false)
  const [rollText, setRollText] = useState('')
  const [exhausted, setExhausted] = useState(false)
  // 룰렛 — 스핀에 쓴 명단은 다음 뽑기 전까지 고정 (포인터-결과 불일치 방지)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [wheelNames, setWheelNames] = useState<string[] | null>(null)
  // 인형뽑기
  const [clawPhase, setClawPhase] = useState<ClawPhase>('idle')
  const pendingRef = useRef<{ picked: string[]; exhausted: boolean } | null>(null)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => timers.current.forEach((t) => window.clearTimeout(t)),
    [],
  )

  // 명단이 바뀌면 세션 초기화
  useEffect(() => {
    setPickedAll([])
    setCurrent(null)
    setExhausted(false)
    setClawPhase('idle')
    setWheelNames(null)
  }, [roster?.id])

  const students = roster?.students ?? []
  const remainingPool = config.allowRepeat
    ? students
    : students.filter((s) => !pickedAll.includes(s))

  const commit = (result: { picked: string[]; exhausted: boolean }) => {
    setCurrent(result.picked)
    setExhausted(result.exhausted)
    if (!config.allowRepeat) {
      setPickedAll((prev) => [...prev, ...result.picked])
    }
    setRolling(false)
  }

  const busy = rolling || spinning || clawPhase === 'down' || clawPhase === 'up'

  const draw = () => {
    if (students.length === 0 || busy) return
    const result = drawStudents({
      roster: students,
      count: config.count,
      exclude: config.allowRepeat ? [] : pickedAll,
      allowRepeat: config.allowRepeat,
      seed: hashSeed(crypto.randomUUID()),
    })
    if (result.picked.length === 0) {
      commit(result)
      return
    }

    if (config.visual === 'roulette') {
      // 결과는 이미 확정 — 휠이 당첨 칸에 멈추도록 회전각 계산
      const idx = Math.max(0, remainingPool.indexOf(result.picked[0]!))
      const sector = 360 / Math.max(remainingPool.length, 1)
      const target =
        Math.ceil(rotation / 360) * 360 + 5 * 360 - (idx + 0.5) * sector
      pendingRef.current = result
      setWheelNames(remainingPool)
      setCurrent(null)
      setSpinning(true)
      setRotation(target)
      return
    }

    if (config.visual === 'claw') {
      pendingRef.current = result
      setCurrent(null)
      setClawPhase('down')
      timers.current.push(
        window.setTimeout(() => setClawPhase('up'), 950),
        window.setTimeout(() => {
          setClawPhase('open')
          if (pendingRef.current) commit(pendingRef.current)
        }, 1900),
      )
      return
    }

    // 텍스트 롤링 (기존 연출)
    setRolling(true)
    setCurrent(null)
    let i = 0
    const roll = window.setInterval(() => {
      setRollText(students[i % students.length]!)
      i += 1
    }, 70)
    timers.current.push(roll)
    timers.current.push(
      window.setTimeout(() => {
        window.clearInterval(roll)
        commit(result)
      }, 900),
    )
  }

  const onSpinEnd = () => {
    setSpinning(false)
    if (pendingRef.current) commit(pendingRef.current)
  }

  const resetSession = () => {
    setPickedAll([])
    setCurrent(null)
    setExhausted(false)
    setClawPhase('idle')
  }

  const accent = ACCENT_CSS_VAR[config.accent]
  const fs = layout === 'fullscreen'
  const resultFontSize = fs
    ? `min(${current && current.length > 2 ? 9 : 14}vw, 26vh)`
    : `min(${current && current.length > 2 ? 7 : 11}vw, 22vh)`

  return (
    <div className={`tool${fs ? ' tool--fullscreen' : ''}`}>
      <RosterPanel onRoster={setRoster} />

      {config.visual === 'roulette' && students.length > 0 && (
        <RouletteWheel
          names={wheelNames ?? (remainingPool.length > 0 ? remainingPool : students)}
          rotation={rotation}
          spinning={spinning}
          onSpinEnd={onSpinEnd}
          accent={accent}
          fs={fs}
        />
      )}

      {config.visual === 'claw' && students.length > 0 && (
        <ClawMachine phase={clawPhase} accent={accent} fs={fs} />
      )}

      <div
        className="draw-result"
        style={{
          fontSize:
            config.visual === 'text'
              ? resultFontSize
              : fs
                ? 'min(6vw, 10vh)'
                : 'min(8vw, 14vh)',
          color: rolling ? 'var(--fg-muted)' : accent,
          minHeight: config.visual === 'text' ? '1.3em' : undefined,
        }}
      >
        {rolling
          ? rollText
          : current
            ? current.join(' · ')
            : config.visual === 'text' && students.length > 0
              ? '?'
              : ''}
      </div>

      {students.length === 0 && (
        <span className="tool__hint">명단을 먼저 만들어 주세요.</span>
      )}

      {config.showPicked && !config.allowRepeat && pickedAll.length > 0 && (
        <div className="picked-chips">
          {pickedAll.map((s, i) => (
            <span key={`${s}-${i}`} className="chip-static">
              {s}
            </span>
          ))}
        </div>
      )}

      {exhausted && (
        <span className="tool__hint">
          남은 학생이 없어요. 처음부터 다시 시작하세요.
        </span>
      )}

      <div className="tool__controls">
        <button
          type="button"
          className="btn"
          onClick={draw}
          disabled={busy || students.length === 0 || (!config.allowRepeat && remainingPool.length === 0)}
        >
          <Dices size={16} aria-hidden />
          {config.count}명 뽑기
        </button>
        {!config.allowRepeat && pickedAll.length > 0 && (
          <button type="button" className="btn btn--ghost" onClick={resetSession}>
            <RotateCcw size={16} aria-hidden />
            처음부터
          </button>
        )}
      </div>

      {!config.allowRepeat && students.length > 0 && (
        <span className="tool__hint">
          남은 학생 {remainingPool.length} / {students.length}명
        </span>
      )}
    </div>
  )
}

/** 섹터 채움 색 순환 (액센트 톤) */
const SECTOR_FILLS = [
  'var(--accent-blue)',
  'var(--accent-pink)',
  'var(--accent-green)',
  'var(--accent-orange)',
  'var(--accent-purple)',
  'var(--accent-teal)',
]

function RouletteWheel({
  names,
  rotation,
  spinning,
  onSpinEnd,
  accent,
  fs,
}: {
  names: string[]
  rotation: number
  spinning: boolean
  onSpinEnd: () => void
  accent: string
  fs: boolean
}) {
  const N = Math.max(names.length, 1)
  const sector = 360 / N
  const R = 46
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180

  const sectorPath = (i: number): string => {
    if (N === 1) return '' // 원 전체는 circle로
    const a0 = rad(i * sector)
    const a1 = rad((i + 1) * sector)
    const x0 = 50 + R * Math.cos(a0)
    const y0 = 50 + R * Math.sin(a0)
    const x1 = 50 + R * Math.cos(a1)
    const y1 = 50 + R * Math.sin(a1)
    return `M 50 50 L ${x0} ${y0} A ${R} ${R} 0 ${sector > 180 ? 1 : 0} 1 ${x1} ${y1} Z`
  }

  const label = (name: string) => (N > 12 ? name.slice(0, 3) : name.slice(0, 5))
  const size = fs ? 'min(52vmin, 56vh)' : 'min(58vmin, 52vh)'

  return (
    <div className="roulette" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 104" style={{ width: '100%', height: '100%' }}>
        {/* 포인터 */}
        <path d="M 50 1 L 46 8 L 54 8 Z" fill={accent} />
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: '50px 56px',
            transition: spinning
              ? 'transform 2600ms cubic-bezier(0.15, 0.55, 0.12, 1)'
              : 'none',
          }}
          onTransitionEnd={onSpinEnd}
        >
          <g transform="translate(0 6)">
            <circle cx="50" cy="50" r={R + 1.5} fill="var(--bg)" stroke="var(--border)" strokeWidth="1.5" />
            {N === 1 ? (
              <circle cx="50" cy="50" r={R} fill={SECTOR_FILLS[0]} fillOpacity="0.3" />
            ) : (
              names.map((_, i) => (
                <path
                  key={i}
                  d={sectorPath(i)}
                  fill={SECTOR_FILLS[i % SECTOR_FILLS.length]}
                  fillOpacity="0.3"
                  stroke="var(--border)"
                  strokeWidth="0.4"
                />
              ))
            )}
            {names.map((name, i) => {
              const mid = (i + 0.5) * sector
              const a = rad(mid)
              const tx = 50 + R * 0.62 * Math.cos(a)
              const ty = 50 + R * 0.62 * Math.sin(a)
              return (
                <text
                  key={i}
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={N > 12 ? 4 : N > 6 ? 5.5 : 7}
                  fontWeight="600"
                  fill="var(--fg)"
                  transform={`rotate(${mid} ${tx} ${ty})`}
                >
                  {label(name)}
                </text>
              )
            })}
            <circle cx="50" cy="50" r="5" fill="var(--bg)" stroke="var(--border)" strokeWidth="1" />
          </g>
        </g>
      </svg>
    </div>
  )
}

function ClawMachine({
  phase,
  accent,
  fs,
}: {
  phase: ClawPhase
  accent: string
  fs: boolean
}) {
  // 캡슐 배치 (유리 안 바닥)
  const capsules: { x: number; y: number; c: string }[] = [
    { x: 30, y: 62, c: SECTOR_FILLS[0]! },
    { x: 44, y: 66, c: SECTOR_FILLS[1]! },
    { x: 58, y: 63, c: SECTOR_FILLS[2]! },
    { x: 70, y: 66, c: SECTOR_FILLS[3]! },
    { x: 37, y: 70, c: SECTOR_FILLS[4]! },
    { x: 52, y: 71, c: SECTOR_FILLS[5]! },
    { x: 65, y: 71, c: SECTOR_FILLS[0]! },
  ]
  const clawDrop = phase === 'down' ? 40 : 0
  const holding = phase === 'up' || phase === 'open'
  const size = fs ? 'min(46vmin, 52vh)' : 'min(54vmin, 48vh)'

  return (
    <div className="claw" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        {/* 기계 몸체 */}
        <rect x="10" y="6" width="80" height="88" rx="8" fill="var(--dial-face, var(--bg))" stroke="var(--border)" strokeWidth="2" />
        {/* 유리창 */}
        <rect x="17" y="18" width="66" height="58" rx="5" fill="var(--bg)" stroke="var(--border)" strokeWidth="1.5" />
        {/* 레일 */}
        <line x1="20" y1="22" x2="80" y2="22" stroke="var(--fg-muted)" strokeWidth="1.5" />
        {/* 바닥 캡슐들 */}
        {capsules.map((cap, i) => (
          <g key={i}>
            <circle cx={cap.x} cy={cap.y} r="6" fill={cap.c} fillOpacity="0.4" stroke="var(--border)" strokeWidth="0.8" />
            <path d={`M ${cap.x - 6} ${cap.y} A 6 6 0 0 0 ${cap.x + 6} ${cap.y}`} fill="var(--bg)" stroke="var(--border)" strokeWidth="0.8" />
          </g>
        ))}
        {/* 집게 */}
        <g
          style={{
            transform: `translateY(${clawDrop}px)`,
            transition: 'transform 900ms var(--ease-gentle)',
          }}
        >
          <line x1="50" y1="22" x2="50" y2="30" stroke="var(--fg)" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M 50 30 L 44 38 M 50 30 L 56 38"
            stroke="var(--fg)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* 잡힌 캡슐 */}
          {holding && (
            <g>
              <circle cx="50" cy="40" r="6.5" fill={accent} fillOpacity="0.45" stroke="var(--border)" strokeWidth="0.8" />
              <path d="M 43.5 40 A 6.5 6.5 0 0 0 56.5 40" fill="var(--bg)" stroke="var(--border)" strokeWidth="0.8" />
            </g>
          )}
        </g>
        {/* 출구 */}
        <rect x="40" y="80" width="20" height="9" rx="2" fill="var(--bg)" stroke="var(--border)" strokeWidth="1.2" />
      </svg>
    </div>
  )
}
