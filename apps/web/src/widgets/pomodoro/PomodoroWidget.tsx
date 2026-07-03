import {
  ACCENT_CSS_VAR,
  createIdle,
  pause,
  remaining,
  reset,
  start,
  tick,
  type PhaseCompleted,
  type PomodoroConfig,
  type PomodoroDurations,
  type PomodoroPhase,
  type PomodoroState,
} from '@nwh/core'
import { Pause, Play, RotateCcw, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import TimerDial from '../../components/TimerDial'
import { beep } from '../../lib/beep'
import {
  fetchStats,
  flushQueue,
  loadQueue,
  recordSession,
} from '../../lib/pomodoroSync'
import type { RecordStats } from '@nwh/core'
import type { WidgetProps } from '../types'

const PHASE_LABEL: Record<PomodoroPhase, string> = {
  focus: '집중',
  shortBreak: '짧은 휴식',
  longBreak: '긴 휴식',
}

/** 일별 누적 (비연동 시 localStorage — 추후 Notion 자동기록과 병행) */
function tallyKey(): string {
  const d = new Date()
  return `nwh:pomodoro:tally:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function getTally(): { count: number; minutes: number } {
  try {
    const raw = localStorage.getItem(tallyKey())
    if (raw) return JSON.parse(raw) as { count: number; minutes: number }
  } catch {
    // 손상 시 0부터
  }
  return { count: 0, minutes: 0 }
}

function addTally(minutes: number): { count: number; minutes: number } {
  const t = getTally()
  const next = { count: t.count + 1, minutes: t.minutes + minutes }
  localStorage.setItem(tallyKey(), JSON.stringify(next))
  return next
}

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PomodoroWidget({
  config,
  layout,
}: WidgetProps<PomodoroConfig>) {
  const durations: PomodoroDurations = useMemo(
    () => ({
      focusMin: config.focusMin,
      shortBreakMin: config.shortBreakMin,
      longBreakMin: config.longBreakMin,
      cyclesPerLongBreak: config.cyclesPerLongBreak,
    }),
    [
      config.focusMin,
      config.shortBreakMin,
      config.longBreakMin,
      config.cyclesPerLongBreak,
    ],
  )

  const [state, setState] = useState<PomodoroState>(() => createIdle(durations))
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [tally, setTally] = useState(getTally)
  const [serverStats, setServerStats] = useState<RecordStats | null>(null)
  const [queueCount, setQueueCount] = useState(() => loadQueue().length)
  const [syncError, setSyncError] = useState<string | null>(null)
  // 세션 시작 시각 — 기록 행의 날짜가 된다
  const sessionStartRef = useRef(new Map<string, number>())

  const refreshStats = async () => {
    if (!config.notionSync) return
    setServerStats(await fetchStats(config.dbId, config.category, config.wt))
  }

  // 연동 켜짐/DB 변경 시: 대기열 재전송 + 통계 로드
  useEffect(() => {
    if (!config.notionSync) {
      setServerStats(null)
      return
    }
    void flushQueue().then((remaining) => {
      setQueueCount(remaining)
      void refreshStats()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.notionSync, config.dbId, config.category, config.wt])

  // 새 집중 세션의 시작 시각 기억
  useEffect(() => {
    if (state.sessionId && !sessionStartRef.current.has(state.sessionId)) {
      sessionStartRef.current.set(state.sessionId, Date.now())
    }
  }, [state.sessionId])

  // 설정(길이) 변경 시 리셋
  useEffect(() => {
    setState(createIdle(durations))
  }, [durations])

  // 표시 갱신 틱 — 시각은 항상 Date.now() 기준 (드리프트 없음)
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  // 페이즈 완료 처리
  useEffect(() => {
    const result = tick(
      state,
      nowMs,
      durations,
      config.autoContinue,
      crypto.randomUUID(),
    )
    if (result.completed) {
      onCompleted(result.completed)
    }
    if (result.state !== state) setState(result.state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowMs])

  const onCompleted = (completed: PhaseCompleted) => {
    if (config.sound) beep(completed.phase === 'focus' ? 2 : 1)
    if (completed.phase !== 'focus') return

    setTally(addTally(completed.minutes))

    // Notion 자동기록 — sessionId가 멱등키 (세션당 정확히 1행)
    if (config.notionSync && completed.sessionId) {
      const startedMs =
        sessionStartRef.current.get(completed.sessionId) ??
        Date.now() - completed.minutes * 60_000
      const fmt = (ms: number) =>
        new Date(ms).toTimeString().slice(0, 5)
      void recordSession({
        sessionId: completed.sessionId,
        startedAt: new Date(startedMs).toISOString(),
        minutes: completed.minutes,
        category: config.category,
        memo: `${fmt(startedMs)}–${fmt(Date.now())} 집중`,
        ...(config.dbId ? { dbId: config.dbId } : {}),
        ...(config.wt ? { wt: config.wt } : {}),
      }).then((error) => {
        setQueueCount(loadQueue().length)
        setSyncError(error)
        if (!error) void refreshStats()
      })
    }
  }

  const resend = async () => {
    const remaining = await flushQueue()
    setQueueCount(remaining)
    if (remaining === 0) {
      setSyncError(null)
      void refreshStats()
    }
  }

  const accent = ACCENT_CSS_VAR[config.accent]
  const running = state.status === 'running'
  const remainMs = remaining(state, nowMs)
  const filledDots = state.completedFocus % config.cyclesPerLongBreak

  const timeFontSize = layout === 'fullscreen' ? 'min(5vw, 8vh)' : '20px'
  const labelFontSize = layout === 'fullscreen' ? 'min(3vw, 5vh)' : '14px'

  return (
    <div className={`tool${layout === 'fullscreen' ? ' tool--fullscreen' : ''}`}>
      {/* Time Timer 스타일 — 다이얼이 가용 공간을 꽉 채운다 */}
      <div className="dial-wrap">
        <TimerDial
          remainingMs={remainMs}
          color={accent}
          size="100%"
          soft={state.phase !== 'focus'}
        />
      </div>

      <div className="tool__bar">
        <span
          className="tool__label"
          style={{
            fontSize: labelFontSize,
            color: state.phase === 'focus' ? accent : undefined,
          }}
        >
          {PHASE_LABEL[state.phase]}
        </span>

        <span className="tool__time" style={{ fontSize: timeFontSize }}>
          {formatMs(remainMs)}
        </span>

        <span className="phase-dots" aria-label="사이클 진행">
          {Array.from({ length: config.cyclesPerLongBreak }, (_, i) => (
            <span
              key={i}
              className="phase-dot"
              style={i < filledDots ? { background: accent, borderColor: accent } : undefined}
            />
          ))}
        </span>

        {running ? (
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setState(pause(state, Date.now()))}
          >
            <Pause size={14} aria-hidden />
            일시정지
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--sm"
            onClick={() =>
              setState(start(state, Date.now(), crypto.randomUUID()))
            }
          >
            <Play size={14} aria-hidden />
            {state.status === 'paused' ? '계속' : '시작'}
          </button>
        )}
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() => setState(reset(durations))}
        >
          <RotateCcw size={14} aria-hidden />
          리셋
        </button>

        <span className="tool__hint">
          {config.notionSync && serverStats
            ? `오늘 ${serverStats.today.count}회 · ${serverStats.today.minutes}분 · 이번 주 ${serverStats.week.minutes}분 · 이번 달 ${serverStats.month.minutes}분`
            : `오늘 ${tally.count}회 · ${tally.minutes}분`}
        </span>

        {config.notionSync && queueCount > 0 && (
          <button type="button" className="btn btn--sm btn--ghost" onClick={resend}>
            <Send size={13} aria-hidden />
            대기 {queueCount}건 재전송
          </button>
        )}

        {config.notionSync && syncError && (
          <span className="tool__error" style={{ fontSize: 12 }}>
            Notion 기록 실패: {syncError}
          </span>
        )}
      </div>
    </div>
  )
}
