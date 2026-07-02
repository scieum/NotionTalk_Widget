import {
  assignSeats,
  hashSeed,
  type SeatFailReason,
  type SeatPickerConfig,
} from '@nwh/core'
import { Shuffle } from 'lucide-react'
import { useEffect, useState } from 'react'
import RosterPanel from '../../components/RosterPanel'
import type { RosterPreset } from '../../lib/roster'
import type { WidgetProps } from '../types'

const FAIL_MESSAGE: Record<SeatFailReason, string> = {
  'no-students': '명단을 먼저 만들어 주세요.',
  'too-many-students': '학생 수가 자리 수보다 많아요. 격자를 키우거나 비활성 칸을 줄여 주세요.',
  'fixed-cell-invalid': '고정석이 격자 밖이거나 비활성 칸이에요.',
  'fixed-conflict': '고정석이 겹칩니다 (같은 칸 또는 같은 학생).',
  'constraints-unsatisfiable': '조건을 만족하는 배치를 찾지 못했어요. 떨어뜨리기 조건을 완화해 주세요.',
}

const HISTORY_KEY = 'nwh:seats:history'
const HISTORY_MAX = 5

interface HistoryEntry {
  at: number
  seats: (string | null)[][]
}

function loadHistory(): HistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : []
  } catch {
    return []
  }
}

export default function SeatPickerWidget({
  config,
  layout,
}: WidgetProps<SeatPickerConfig>) {
  const [roster, setRoster] = useState<RosterPreset | null>(null)
  const [seats, setSeats] = useState<(string | null)[][] | null>(null)
  const [revealed, setRevealed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)

  const totalPlaced = seats?.flat().filter(Boolean).length ?? 0

  // 순차 공개 연출
  useEffect(() => {
    if (!seats || revealed >= totalPlaced) return
    if (config.revealMs === 0) {
      setRevealed(totalPlaced)
      return
    }
    const id = window.setTimeout(
      () => setRevealed((n) => n + 1),
      config.revealMs,
    )
    return () => window.clearTimeout(id)
  }, [seats, revealed, totalPlaced, config.revealMs])

  const draw = () => {
    if (!roster || roster.students.length === 0) {
      setError(FAIL_MESSAGE['no-students'])
      return
    }
    const result = assignSeats({
      rows: config.rows,
      cols: config.cols,
      disabled: config.disabled,
      students: roster.students,
      constraints: { fixed: roster.fixed, apart: roster.apart },
      seed: hashSeed(crypto.randomUUID()),
    })
    if (!result.ok) {
      setError(FAIL_MESSAGE[result.reason])
      return
    }
    setError(null)
    setSeats(result.seats)
    setRevealed(0)
    const entry: HistoryEntry = { at: Date.now(), seats: result.seats }
    const nextHistory = [entry, ...loadHistory()].slice(0, HISTORY_MAX)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory))
    setHistory(nextHistory)
  }

  const showHistory = (entry: HistoryEntry) => {
    setSeats(entry.seats)
    setError(null)
    setRevealed(entry.seats.flat().filter(Boolean).length)
  }

  // 공개 순서: 행 우선으로 배치된 학생의 순번
  let placeIndex = -1

  const cellFontSize =
    layout === 'fullscreen'
      ? `min(3.6vmin, ${52 / config.rows}vh)`
      : 'clamp(9px, 2.6vmin, 14px)'

  return (
    <div className={`tool${layout === 'fullscreen' ? ' tool--fullscreen' : ''}`}>
      <RosterPanel onRoster={setRoster} showConstraints />

      <span className="board-label">칠판</span>

      <div
        className="seat-grid"
        style={{
          gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
          gridTemplateRows: `repeat(${config.rows}, 1fr)`,
          fontSize: cellFontSize,
          maxWidth: layout === 'fullscreen' ? '86vmin' : 520,
        }}
      >
        {Array.from({ length: config.rows * config.cols }, (_, i) => {
          const r = Math.floor(i / config.cols)
          const c = i % config.cols
          const key = `${r},${c}`
          if (config.disabled.includes(key)) {
            return <div key={key} className="seat seat--disabled" />
          }
          const student = seats?.[r]?.[c] ?? null
          if (student) placeIndex += 1
          const hidden = student !== null && placeIndex >= revealed
          return (
            <div key={key} className={`seat${hidden ? ' seat--hidden' : ''}`}>
              {student ?? ''}
            </div>
          )
        })}
      </div>

      {error && <span className="tool__error">{error}</span>}

      <div className="tool__controls">
        <button type="button" className="btn" onClick={draw}>
          <Shuffle size={16} aria-hidden />
          자리 뽑기
        </button>
        {history.length > 0 && (
          <select
            aria-label="이전 배치"
            className="chip"
            style={{ cursor: 'pointer' }}
            value=""
            onChange={(e) => {
              const entry = history[Number(e.target.value)]
              if (entry) showHistory(entry)
            }}
          >
            <option value="" disabled>
              이전 배치 ({history.length})
            </option>
            {history.map((entry, i) => (
              <option key={entry.at} value={i}>
                {new Date(entry.at).toLocaleString()}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
