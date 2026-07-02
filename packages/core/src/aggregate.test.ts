import { describe, expect, it } from 'vitest'
import { aggregateRecords } from './aggregate'

// 2026-07-02(목) 오후 기준
const NOW = new Date(2026, 6, 2, 15, 0)

describe('기록 집계', () => {
  it('오늘/이번 주(월요일 시작)/이번 달을 나눠 집계한다', () => {
    const rows = [
      { date: new Date(2026, 6, 2, 10, 0).toISOString(), minutes: 25 }, // 오늘
      { date: new Date(2026, 6, 1, 9, 0).toISOString(), minutes: 50 }, // 어제(수) — 주·월
      { date: new Date(2026, 5, 29, 9, 0).toISOString(), minutes: 30 }, // 월요일 — 주만 (6월)
      { date: new Date(2026, 5, 28, 9, 0).toISOString(), minutes: 60 }, // 일요일 — 지난주
    ]
    const stats = aggregateRecords(rows, NOW)
    expect(stats.today).toEqual({ count: 1, minutes: 25 })
    expect(stats.week).toEqual({ count: 3, minutes: 105 })
    expect(stats.month).toEqual({ count: 2, minutes: 75 })
  })

  it('NaN·음수·미래 행은 제외한다 (합계 = Σ유효 행)', () => {
    const rows = [
      { date: new Date(2026, 6, 2, 10, 0).toISOString(), minutes: 25 },
      { date: 'not-a-date', minutes: 10 },
      { date: new Date(2026, 6, 2, 11, 0).toISOString(), minutes: NaN },
      { date: new Date(2026, 6, 2, 12, 0).toISOString(), minutes: -5 },
      { date: new Date(2026, 6, 3, 10, 0).toISOString(), minutes: 99 }, // 내일
    ]
    const stats = aggregateRecords(rows, NOW)
    expect(stats.today).toEqual({ count: 1, minutes: 25 })
    expect(stats.month.minutes).toBe(25)
  })

  it('날짜만 있는 행(시간 없음)도 오늘로 집계된다', () => {
    const stats = aggregateRecords([{ date: '2026-07-02', minutes: 40 }], NOW)
    expect(stats.today.minutes).toBe(40)
  })

  it('빈 입력 → 0', () => {
    const stats = aggregateRecords([], NOW)
    expect(stats.today).toEqual({ count: 0, minutes: 0 })
  })
})
