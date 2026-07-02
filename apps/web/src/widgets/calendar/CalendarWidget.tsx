import { ACCENT_CSS_VAR, type CalendarConfig } from '@nwh/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNow } from '../../hooks/useNow'
import type { WidgetProps } from '../types'

export default function CalendarWidget({
  config,
  layout,
}: WidgetProps<CalendarConfig>) {
  const now = useNow(60_000)
  const [offset, setOffset] = useState(0)
  const accent = ACCENT_CSS_VAR[config.accent]

  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const startDow = config.weekStart === 'mon' ? 1 : 0

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long' }),
    [],
  )
  const weekdayFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: 'short' }),
    [],
  )

  // 요일 라벨 — 2024-01-07은 일요일
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFormatter.format(new Date(2024, 0, 7 + startDow + i)),
  )

  const lead = (view.getDay() - startDow + 7) % 7
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const rowCount = Math.ceil((lead + daysInMonth) / 7)
  const cells = Array.from(
    { length: rowCount * 7 },
    (_, i) => new Date(view.getFullYear(), view.getMonth(), 1 - lead + i),
  )

  const isToday = (d: Date) =>
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  const fontSize =
    layout === 'fullscreen' ? '3vmin' : 'clamp(11px, 3.4vmin, 16px)'

  return (
    <div className={`tool${layout === 'fullscreen' ? ' tool--fullscreen' : ''}`}>
      <div className="cal" style={{ fontSize }}>
        <div className="cal__header">
          <span className="cal__title" style={{ fontSize: '1.2em' }}>
            {monthFormatter.format(view)}
          </span>
          {config.showNav && (
            <span style={{ display: 'inline-flex', gap: 4 }}>
              {offset !== 0 && (
                <button
                  type="button"
                  className="cal__nav"
                  onClick={() => setOffset(0)}
                  style={{ fontSize: '0.75em', padding: '2px 8px' }}
                >
                  오늘
                </button>
              )}
              <button
                type="button"
                className="cal__nav"
                aria-label="이전 달"
                onClick={() => setOffset((o) => o - 1)}
              >
                <ChevronLeft size={16} aria-hidden />
              </button>
              <button
                type="button"
                className="cal__nav"
                aria-label="다음 달"
                onClick={() => setOffset((o) => o + 1)}
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </span>
          )}
        </div>

        <div className="cal__grid" style={{ fontSize: '0.72em' }}>
          {weekdays.map((w) => (
            <span key={w} className="cal__weekday">
              {w}
            </span>
          ))}
        </div>
        <div className="cal__grid">
          {cells.map((d) => {
            const other = d.getMonth() !== view.getMonth()
            const today = isToday(d)
            return (
              <span
                key={d.toISOString()}
                className={`cal__cell${other ? ' cal__cell--other' : ''}`}
                style={
                  today
                    ? { background: accent, color: '#ffffff', fontWeight: 700 }
                    : undefined
                }
              >
                {d.getDate()}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
