import { describe, expect, it } from 'vitest'
import {
  createIdle,
  pause,
  remaining,
  start,
  tick,
  type PomodoroDurations,
} from './pomodoro'

const D: PomodoroDurations = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  cyclesPerLongBreak: 4,
}
const MS = 60_000
const T0 = 1_000_000

describe('뽀모도로 상태머신', () => {
  it('idle → start → 정확한 종료 시각', () => {
    const s = start(createIdle(D), T0, 'sess-1')
    expect(s.status).toBe('running')
    expect(s.endsAt).toBe(T0 + 25 * MS)
    expect(s.sessionId).toBe('sess-1')
  })

  it('pause/resume가 남은 시간을 보존한다', () => {
    let s = start(createIdle(D), T0, 'sess-1')
    s = pause(s, T0 + 10 * MS)
    expect(s.remainingMs).toBe(15 * MS)
    s = start(s, T0 + 99 * MS) // 한참 뒤 재개
    expect(s.endsAt).toBe(T0 + 99 * MS + 15 * MS)
    expect(s.sessionId).toBe('sess-1') // 세션 유지 — 재개는 새 세션이 아니다
  })

  it('집중 완료 → shortBreak + completed 이벤트(세션ID·분)', () => {
    const s = start(createIdle(D), T0, 'sess-1')
    const { state, completed } = tick(s, T0 + 25 * MS, D, false)
    expect(completed).toEqual({ phase: 'focus', sessionId: 'sess-1', minutes: 25 })
    expect(state.phase).toBe('shortBreak')
    expect(state.status).toBe('idle')
    expect(state.completedFocus).toBe(1)
  })

  it('탭 비활성으로 늦게 tick해도(드리프트) 완료가 정확히 잡힌다', () => {
    const s = start(createIdle(D), T0, 'sess-1')
    const { completed } = tick(s, T0 + 90 * MS, D, false) // 65분 늦음
    expect(completed?.phase).toBe('focus')
  })

  it('N번째 집중 후에는 longBreak', () => {
    let s = createIdle(D)
    for (let i = 0; i < 3; i++) {
      s = start(s, T0, `sess-${i}`)
      const r = tick(s, T0 + 200 * MS, D, false)
      s = r.state
      // 휴식도 넘긴다
      s = start(s, T0)
      s = tick(s, T0 + 200 * MS, D, false).state
    }
    expect(s.completedFocus).toBe(3)
    s = start(s, T0, 'sess-4')
    const { state } = tick(s, T0 + 200 * MS, D, false)
    expect(state.phase).toBe('longBreak')
  })

  it('autoContinue면 다음 페이즈가 즉시 running', () => {
    const s = start(createIdle(D), T0, 'sess-1')
    const { state } = tick(s, T0 + 25 * MS, D, true)
    expect(state.status).toBe('running')
    expect(state.phase).toBe('shortBreak')
    expect(state.endsAt).toBe(T0 + 25 * MS + 5 * MS)
  })

  it('휴식 완료 이벤트에는 sessionId가 없다', () => {
    let s = start(createIdle(D), T0, 'sess-1')
    s = tick(s, T0 + 25 * MS, D, true).state // shortBreak running
    const { completed } = tick(s, T0 + 30 * MS, D, false)
    expect(completed?.phase).toBe('shortBreak')
    expect(completed?.sessionId).toBeNull()
  })

  it('remaining은 running/paused/idle 모두에서 표시값을 준다', () => {
    const idle = createIdle(D)
    expect(remaining(idle, T0)).toBe(25 * MS)
    const running = start(idle, T0)
    expect(remaining(running, T0 + 10 * MS)).toBe(15 * MS)
    expect(remaining(running, T0 + 999 * MS)).toBe(0) // 음수 금지
    const paused = pause(running, T0 + 10 * MS)
    expect(remaining(paused, T0 + 500 * MS)).toBe(15 * MS)
  })

  it('페이즈 미완료 tick은 상태를 바꾸지 않는다', () => {
    const s = start(createIdle(D), T0, 'sess-1')
    const { state, completed } = tick(s, T0 + 10 * MS, D, false)
    expect(completed).toBeNull()
    expect(state).toBe(s)
  })
})
