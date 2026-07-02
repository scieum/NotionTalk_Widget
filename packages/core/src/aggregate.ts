/**
 * 기록 집계 — 순수함수 (서버·클라이언트 공용).
 * 원본 행은 Notion에, 집계는 코드가 (도메인 불변식 3).
 */

export interface StudyRow {
  /** ISO 날짜 또는 일시 */
  date: string
  minutes: number
  category?: string
}

export interface Tally {
  count: number
  minutes: number
}

export interface RecordStats {
  today: Tally
  week: Tally
  month: Tally
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** 월요일 시작 주 */
function startOfWeek(d: Date): Date {
  const day = startOfDay(d)
  const dow = (day.getDay() + 6) % 7 // 월=0
  day.setDate(day.getDate() - dow)
  return day
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function aggregateRecords(rows: StudyRow[], now: Date): RecordStats {
  const dayStart = startOfDay(now).getTime()
  const weekStart = startOfWeek(now).getTime()
  const monthStart = startOfMonth(now).getTime()
  const end = dayStart + 24 * 3600 * 1000

  const stats: RecordStats = {
    today: { count: 0, minutes: 0 },
    week: { count: 0, minutes: 0 },
    month: { count: 0, minutes: 0 },
  }

  for (const row of rows) {
    const t = new Date(row.date).getTime()
    const minutes = row.minutes
    // NaN·음수·미래 행은 집계에서 제외 (합계 = Σ유효 행)
    if (!Number.isFinite(t) || !Number.isFinite(minutes) || minutes <= 0) continue
    if (t >= end) continue

    const add = (tally: Tally) => {
      tally.count += 1
      tally.minutes += minutes
    }
    if (t >= dayStart) add(stats.today)
    if (t >= weekStart) add(stats.week)
    if (t >= monthStart) add(stats.month)
  }

  return stats
}
