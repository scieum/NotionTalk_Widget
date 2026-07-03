import {
  ACCENT_CSS_VAR,
  generateLadder,
  hashSeed,
  seededShuffle,
  mulberry32,
  traceLadder,
  type LadderConfig,
} from '@nwh/core'
import { RotateCcw, Eye } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import RosterPanel from '../../components/RosterPanel'
import type { RosterPreset } from '../../lib/roster'
import type { WidgetProps } from '../types'

const ROWS = 10
/** 공개된 경로 색 순환 */
const PATH_COLORS = [
  'var(--accent-blue)',
  'var(--accent-pink)',
  'var(--accent-green)',
  'var(--accent-orange)',
  'var(--accent-purple)',
  'var(--accent-teal)',
]

export default function LadderWidget({
  config,
  layout,
}: WidgetProps<LadderConfig>) {
  const [roster, setRoster] = useState<RosterPreset | null>(null)
  const [seed, setSeed] = useState(() => hashSeed(crypto.randomUUID()))
  const [revealed, setRevealed] = useState<Map<number, number>>(new Map())
  const [animating, setAnimating] = useState<number | null>(null)
  const timer = useRef<number>()

  // 참가자 — 명단이 없으면 번호로 대체 (바로 써볼 수 있게)
  const participants = useMemo(() => {
    const fromRoster = roster?.students ?? []
    if (fromRoster.length >= 2) return fromRoster.slice(0, config.maxSlots)
    return Array.from({ length: Math.min(4, config.maxSlots) }, (_, i) => `${i + 1}번`)
  }, [roster?.students, config.maxSlots])
  const usingFallback = (roster?.students.length ?? 0) < 2

  const slots = participants.length
  const spec = useMemo(() => generateLadder(slots, ROWS, seed), [slots, seed])

  // 결과 라벨 — 모자라면 blankLabel로 채우고 시드로 섞는다
  const results = useMemo(() => {
    const base = config.results.slice(0, slots)
    while (base.length < slots) base.push(config.blankLabel)
    return seededShuffle(base, mulberry32(seed ^ 0x9e3779b9))
  }, [config.results, config.blankLabel, slots, seed])

  const traces = useMemo(
    () => Array.from({ length: slots }, (_, c) => traceLadder(spec, c)),
    [spec, slots],
  )

  const reveal = (start: number) => {
    if (revealed.has(start) || animating !== null) return
    setAnimating(start)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setRevealed((prev) => new Map(prev).set(start, traces[start]!.end))
      setAnimating(null)
    }, 1300)
  }

  const revealAll = () => {
    setAnimating(null)
    setRevealed(new Map(traces.map((t, c) => [c, t.end])))
  }

  const rebuild = () => {
    setSeed(hashSeed(crypto.randomUUID()))
    setRevealed(new Map())
    setAnimating(null)
  }

  const fs = layout === 'fullscreen'
  const accent = ACCENT_CSS_VAR[config.accent]
  const colWidth = 100 / slots
  const x = (c: number) => (c + 0.5) * colWidth
  const yTop = 2
  const yBottom = 58
  const yRung = (r: number) => yTop + ((r + 1) * (yBottom - yTop)) / (ROWS + 1)

  /** 추적 경로 → ㄴ자 폴리라인 좌표 */
  const pathPoints = (start: number): string => {
    const { path } = traces[start]!
    const pts: string[] = [`${x(start)},${yTop}`]
    for (let r = 0; r < ROWS; r++) {
      const from = path[r]!
      const to = path[r + 1]!
      if (from !== to) {
        pts.push(`${x(from)},${yRung(r)}`, `${x(to)},${yRung(r)}`)
      }
    }
    pts.push(`${x(path[ROWS]!)},${yBottom}`)
    return pts.join(' ')
  }

  const labelFontSize = fs ? 'min(2.2vw, 3.4vh)' : 'min(3vw, 13px)'

  return (
    <div className={`tool${fs ? ' tool--fullscreen' : ''}`}>
      <RosterPanel onRoster={setRoster} />
      {usingFallback && (
        <span className="tool__hint">명단을 만들면 학생 이름으로 진행돼요.</span>
      )}

      <div className="ladder">
        {/* 참가자 (클릭 → 경로 공개) */}
        <div className="ladder__row">
          {participants.map((p, c) => (
            <button
              key={`${p}-${c}`}
              type="button"
              className={`ladder__name${revealed.has(c) || animating === c ? ' ladder__name--done' : ''}`}
              style={{
                width: `${colWidth}%`,
                fontSize: labelFontSize,
                color:
                  revealed.has(c) || animating === c
                    ? PATH_COLORS[c % PATH_COLORS.length]
                    : undefined,
              }}
              onClick={() => reveal(c)}
              disabled={revealed.has(c) || animating !== null}
            >
              {p}
            </button>
          ))}
        </div>

        <svg
          className="ladder__svg"
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          aria-label="사다리"
        >
          {participants.map((_, c) => (
            <line
              key={c}
              x1={x(c)}
              y1={yTop}
              x2={x(c)}
              y2={yBottom}
              stroke="var(--fg-muted)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {spec.rungs.map((row, r) =>
            row.map((has, c) =>
              has ? (
                <line
                  key={`${r}-${c}`}
                  x1={x(c)}
                  y1={yRung(r)}
                  x2={x(c + 1)}
                  y2={yRung(r)}
                  stroke="var(--fg-muted)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null,
            ),
          )}
          {/* 공개된 경로 */}
          {[...revealed.keys()].map((c) => (
            <polyline
              key={`done-${c}-${seed}`}
              points={pathPoints(c)}
              fill="none"
              stroke={PATH_COLORS[c % PATH_COLORS.length]}
              strokeWidth="3"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity="0.85"
            />
          ))}
          {/* 애니메이션 중인 경로 */}
          {animating !== null && (
            <polyline
              key={`anim-${animating}-${seed}`}
              className="ladder__trace"
              points={pathPoints(animating)}
              fill="none"
              stroke={PATH_COLORS[animating % PATH_COLORS.length]}
              strokeWidth="3"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pathLength={100}
            />
          )}
        </svg>

        {/* 결과 라벨 */}
        <div className="ladder__row">
          {results.map((label, c) => {
            const winner = [...revealed.entries()].find(([, end]) => end === c)?.[0]
            const isWin = label !== config.blankLabel
            return (
              <span
                key={`${label}-${c}`}
                className="ladder__result"
                style={{
                  width: `${colWidth}%`,
                  fontSize: labelFontSize,
                  color:
                    winner !== undefined
                      ? PATH_COLORS[winner % PATH_COLORS.length]
                      : isWin
                        ? accent
                        : 'var(--fg-muted)',
                  fontWeight: isWin ? 700 : 400,
                }}
              >
                {label}
              </span>
            )
          })}
        </div>
      </div>

      {/* 공개된 매칭 */}
      {revealed.size > 0 && (
        <div className="picked-chips">
          {[...revealed.entries()].map(([start, end]) => (
            <span key={start} className="chip-static">
              {participants[start]} → {results[end]}
            </span>
          ))}
        </div>
      )}

      <div className="tool__controls">
        <button
          type="button"
          className="btn"
          onClick={revealAll}
          disabled={animating !== null || revealed.size === slots}
        >
          <Eye size={16} aria-hidden />
          모두 공개
        </button>
        <button type="button" className="btn btn--ghost" onClick={rebuild}>
          <RotateCcw size={16} aria-hidden />
          새 사다리
        </button>
      </div>
    </div>
  )
}
