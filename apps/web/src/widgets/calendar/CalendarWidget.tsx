import { ACCENT_CSS_VAR, type CalendarConfig } from '@nwh/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNow } from '../../hooks/useNow'
import { useWidgetFont } from '../../hooks/useWidgetFont'
import {
  fetchTasks,
  localDateKey,
  sortTasks,
  taskDateKey,
  type Task,
} from '../../lib/tasks'
import type { WidgetProps } from '../types'

type Load =
  | { kind: 'off' }
  | { kind: 'loading' }
  | { kind: 'ready'; tasks: Task[] }
  | { kind: 'error'; message: string }

export default function CalendarWidget({
  config,
  layout,
}: WidgetProps<CalendarConfig>) {
  const now = useNow(60_000)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [load, setLoad] = useState<Load>(config.dbId ? { kind: 'loading' } : { kind: 'off' })
  const accent = ACCENT_CSS_VAR[config.accent]

  // 할일 DB 불러오기 (연결된 경우)
  useEffect(() => {
    if (!config.dbId) {
      setLoad({ kind: 'off' })
      return
    }
    let cancelled = false
    setLoad({ kind: 'loading' })
    void fetchTasks(config.dbId, config.wt).then((r) => {
      if (cancelled) return
      setLoad(r.ok ? { kind: 'ready', tasks: r.tasks } : { kind: 'error', message: r.message })
    })
    return () => {
      cancelled = true
    }
  }, [config.dbId, config.wt])

  // 마감일 키 → 할일 (완료 표시 옵션 반영)
  const tasksByKey = useMemo(() => {
    const map = new Map<string, Task[]>()
    if (load.kind !== 'ready') return map
    for (const t of load.tasks) {
      if (!config.showDone && t.done) continue
      const key = taskDateKey(t.date)
      if (!key) continue
      const list = map.get(key)
      if (list) list.push(t)
      else map.set(key, [t])
    }
    return map
  }, [load, config.showDone])

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
  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', weekday: 'short' }),
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

  const todayKey = localDateKey(now)
  const isToday = (key: string) => key === todayKey

  const tasksOn = config.dbId !== ''
  const selectedKey = selected ?? todayKey
  const selectedTasks = tasksOn ? sortTasks(tasksByKey.get(selectedKey) ?? []) : []

  const fontSize =
    layout === 'fullscreen' ? '3vmin' : 'clamp(11px, 3.4vmin, 16px)'
  const fontStyle = useWidgetFont(config.font)

  return (
    <div className={`tool${layout === 'fullscreen' ? ' tool--fullscreen' : ''}`}>
      <div className={`cal${tasksOn ? ' cal--tasks' : ''}`} style={{ fontSize, ...fontStyle }}>
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
        {/* 행 수(4~6주)에 관계없이 가용 높이를 1fr로 나눠 비율이 깨지지 않는다 */}
        <div
          className="cal__grid cal__grid--days"
          style={{ gridTemplateRows: `repeat(${rowCount}, 1fr)` }}
        >
          {cells.map((d) => {
            const key = localDateKey(d)
            const other = d.getMonth() !== view.getMonth()
            const today = isToday(key)
            const dayTasks = tasksOn ? tasksByKey.get(key) : undefined
            const hasOpen = dayTasks?.some((t) => !t.done) ?? false
            const isSelected = tasksOn && key === selectedKey && !today
            return (
              <button
                type="button"
                key={key}
                className={`cal__cell${other ? ' cal__cell--other' : ''}${
                  tasksOn ? ' cal__cell--btn' : ''
                }${isSelected ? ' cal__cell--selected' : ''}`}
                onClick={tasksOn ? () => setSelected(key) : undefined}
                disabled={!tasksOn}
                aria-pressed={tasksOn ? key === selectedKey : undefined}
              >
                <span
                  className="cal__daynum"
                  style={
                    today
                      ? { background: accent, color: '#ffffff', fontWeight: 700 }
                      : undefined
                  }
                >
                  {d.getDate()}
                </span>
                {dayTasks && dayTasks.length > 0 && (
                  <span
                    className="cal__dot"
                    style={{ background: hasOpen ? accent : 'var(--fg-muted)' }}
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>

        {tasksOn && (
          <div className="cal__tasks">
            <div className="cal__tasks-head">
              {dayFormatter.format(new Date(`${selectedKey}T00:00:00`))}
              {load.kind === 'ready' && selectedTasks.length > 0 && (
                <span className="cal__tasks-count">{selectedTasks.length}</span>
              )}
            </div>
            {load.kind === 'loading' && <p className="cal__tasks-hint">할일 불러오는 중…</p>}
            {load.kind === 'error' && <p className="cal__tasks-hint">{load.message}</p>}
            {load.kind === 'ready' && selectedTasks.length === 0 && (
              <p className="cal__tasks-hint">이 날 할일이 없어요.</p>
            )}
            {load.kind === 'ready' && selectedTasks.length > 0 && (
              <ul className="cal__tasks-list">
                {selectedTasks.map((t, i) => (
                  <li key={`${t.title}-${i}`} className={`todo-item${t.done ? ' todo-item--done' : ''}`}>
                    <span
                      className="todo-check"
                      style={t.done ? { background: accent, borderColor: accent } : undefined}
                      aria-hidden
                    />
                    <span className="todo-text">{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
