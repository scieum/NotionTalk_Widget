/**
 * 뽀모도로 상태머신 — 순수함수.
 * 모든 시간 계산은 호출자가 넘기는 타임스탬프(now) 기준 —
 * setInterval 누적 금지 규약. 탭이 오래 비활성이어도 now로 정확히 복원된다.
 */

export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak'

export interface PomodoroDurations {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  cyclesPerLongBreak: number
}

export interface PomodoroState {
  phase: PomodoroPhase
  status: 'idle' | 'running' | 'paused'
  /** running일 때만: 페이즈 종료 시각 (epoch ms) */
  endsAt: number | null
  /** idle/paused일 때만: 남은 ms */
  remainingMs: number
  /** 완료한 집중 세션 수 (긴 휴식 주기 계산) */
  completedFocus: number
  /** 진행 중 집중 세션의 멱등키 (Notion 자동기록 중복 방지용) */
  sessionId: string | null
}

export interface PhaseCompleted {
  phase: PomodoroPhase
  /** 완료된 집중 세션의 멱등키 (휴식 완료면 null) */
  sessionId: string | null
  /** 완료된 페이즈 길이 (분) — 기록용 */
  minutes: number
}

const MS = 60_000

function phaseMs(phase: PomodoroPhase, d: PomodoroDurations): number {
  switch (phase) {
    case 'focus':
      return d.focusMin * MS
    case 'shortBreak':
      return d.shortBreakMin * MS
    case 'longBreak':
      return d.longBreakMin * MS
  }
}

function phaseMin(phase: PomodoroPhase, d: PomodoroDurations): number {
  return phaseMs(phase, d) / MS
}

export function createIdle(d: PomodoroDurations): PomodoroState {
  return {
    phase: 'focus',
    status: 'idle',
    endsAt: null,
    remainingMs: phaseMs('focus', d),
    completedFocus: 0,
    sessionId: null,
  }
}

/**
 * 시작/재개. 집중 페이즈를 새로 시작할 때는 호출자가 sessionId(UUID)를
 * 공급한다 (core는 순수성 유지 — UUID 생성은 호출자 몫).
 */
export function start(
  state: PomodoroState,
  now: number,
  newSessionId?: string,
): PomodoroState {
  if (state.status === 'running') return state
  return {
    ...state,
    status: 'running',
    endsAt: now + state.remainingMs,
    remainingMs: 0,
    sessionId:
      state.phase === 'focus' ? (state.sessionId ?? newSessionId ?? null) : null,
  }
}

export function pause(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== 'running' || state.endsAt === null) return state
  return {
    ...state,
    status: 'paused',
    endsAt: null,
    remainingMs: Math.max(0, state.endsAt - now),
  }
}

export function reset(d: PomodoroDurations): PomodoroState {
  return createIdle(d)
}

/** 표시용 남은 ms */
export function remaining(state: PomodoroState, now: number): number {
  if (state.status === 'running' && state.endsAt !== null) {
    return Math.max(0, state.endsAt - now)
  }
  return state.remainingMs
}

function nextPhase(state: PomodoroState, d: PomodoroDurations): PomodoroPhase {
  if (state.phase !== 'focus') return 'focus'
  return (state.completedFocus + 1) % d.cyclesPerLongBreak === 0
    ? 'longBreak'
    : 'shortBreak'
}

/**
 * 주기 호출 (UI의 interval/visibilitychange에서).
 * 페이즈가 끝났으면 다음 페이즈로 전이하고 completed 이벤트를 반환한다.
 * autoContinue=false면 다음 페이즈는 idle로 대기, true면 즉시 running.
 * (자동 연속 시 다음 집중 세션 sessionId는 호출자가 다음 start에서 공급 —
 *  autoContinue의 집중 세션은 nextSessionId 인자로 공급)
 */
export function tick(
  state: PomodoroState,
  now: number,
  d: PomodoroDurations,
  autoContinue: boolean,
  nextSessionId?: string,
): { state: PomodoroState; completed: PhaseCompleted | null } {
  if (state.status !== 'running' || state.endsAt === null || now < state.endsAt) {
    return { state, completed: null }
  }

  const completed: PhaseCompleted = {
    phase: state.phase,
    sessionId: state.phase === 'focus' ? state.sessionId : null,
    minutes: phaseMin(state.phase, d),
  }

  const phase = nextPhase(state, d)
  const completedFocus =
    state.phase === 'focus' ? state.completedFocus + 1 : state.completedFocus

  const idleNext: PomodoroState = {
    phase,
    status: 'idle',
    endsAt: null,
    remainingMs: phaseMs(phase, d),
    completedFocus,
    sessionId: null,
  }

  return {
    state: autoContinue
      ? start(idleNext, now, phase === 'focus' ? nextSessionId : undefined)
      : idleNext,
    completed,
  }
}
