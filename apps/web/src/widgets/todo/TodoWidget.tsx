import { ACCENT_CSS_VAR, type TodoConfig } from '@nwh/core'
import { ListTodo } from 'lucide-react'
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
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; tasks: Task[] }
  | { kind: 'error'; message: string }

interface Group {
  label: string
  tasks: Task[]
  muted?: boolean
}

export default function TodoWidget({ config, layout }: WidgetProps<TodoConfig>) {
  const now = useNow(60_000)
  const [load, setLoad] = useState<Load>(config.dbId ? { kind: 'loading' } : { kind: 'idle' })
  const accent = ACCENT_CSS_VAR[config.accent]

  useEffect(() => {
    if (!config.dbId) {
      setLoad({ kind: 'idle' })
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

  const todayKey = localDateKey(now)
  const dateChip = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'numeric', day: 'numeric', weekday: 'short' }),
    [],
  )

  const chipLabel = (key: string | null): string | null => {
    if (!key) return null
    if (key === todayKey) return '오늘'
    return dateChip.format(new Date(`${key}T00:00:00`))
  }

  // 완료 필터 + 정렬 + (옵션) 마감일 기준 묶기
  const groups = useMemo<Group[]>(() => {
    if (load.kind !== 'ready') return []
    let tasks = load.tasks
    if (config.completed === 'hide') tasks = tasks.filter((t) => !t.done)
    tasks = sortTasks(tasks)

    if (!config.groupByDate) return [{ label: '', tasks }]

    const overdue: Task[] = []
    const today: Task[] = []
    const upcoming: Task[] = []
    const undated: Task[] = []
    const done: Task[] = []
    for (const t of tasks) {
      if (t.done) {
        done.push(t)
        continue
      }
      const key = taskDateKey(t.date)
      if (!key) undated.push(t)
      else if (key < todayKey) overdue.push(t)
      else if (key === todayKey) today.push(t)
      else upcoming.push(t)
    }
    const out: Group[] = []
    if (overdue.length) out.push({ label: '지난 할일', tasks: overdue })
    if (today.length) out.push({ label: '오늘', tasks: today })
    if (upcoming.length) out.push({ label: '예정', tasks: upcoming })
    if (undated.length) out.push({ label: '날짜 없음', tasks: undated })
    if (done.length) out.push({ label: '완료', tasks: done, muted: true })
    return out
  }, [load, config.completed, config.groupByDate, todayKey])

  const total = load.kind === 'ready' ? groups.reduce((n, g) => n + g.tasks.length, 0) : 0
  const fontStyle = useWidgetFont(config.font)
  const fontSize = layout === 'fullscreen' ? '2.4vmin' : 'clamp(12px, 3.4vmin, 15px)'

  return (
    <div className={`tool${layout === 'fullscreen' ? ' tool--fullscreen' : ''}`}>
      <div className="todo" style={{ fontSize, ...fontStyle }}>
        {config.showTitle && (
          <div className="todo__head">
            <ListTodo size={16} aria-hidden />
            <span className="todo__title">할일</span>
            {load.kind === 'ready' && total > 0 && <span className="todo__count">{total}</span>}
          </div>
        )}

        {load.kind === 'idle' && (
          <p className="todo__empty">
            설정에서 Notion 할일 DB를 연결하면 목록이 여기에 표시돼요.
          </p>
        )}
        {load.kind === 'loading' && <p className="todo__empty">할일 불러오는 중…</p>}
        {load.kind === 'error' && <p className="todo__empty">{load.message}</p>}
        {load.kind === 'ready' && total === 0 && (
          <p className="todo__empty">표시할 할일이 없어요.</p>
        )}

        {load.kind === 'ready' && total > 0 && (
          <div className="todo__scroll">
            {groups.map((g) => (
              <div key={g.label} className="todo__group">
                {g.label && <div className="todo__group-label">{g.label}</div>}
                <ul className="todo__list">
                  {g.tasks.map((t, i) => {
                    const chip = chipLabel(taskDateKey(t.date))
                    return (
                      <li
                        key={`${t.title}-${i}`}
                        className={`todo-item${t.done ? ' todo-item--done' : ''}`}
                      >
                        <span
                          className="todo-check"
                          style={t.done ? { background: accent, borderColor: accent } : undefined}
                          aria-hidden
                        />
                        <span className="todo-text">{t.title}</span>
                        {chip && !g.muted && <span className="todo-date">{chip}</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
