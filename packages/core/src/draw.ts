import { mulberry32, seededShuffle } from './prng'

/**
 * 랜덤 추첨 — 순수함수. 순차 공개 애니메이션은 UI 몫, 여기는 결과만.
 */

export interface DrawResult {
  picked: string[]
  /** 중복 제외 모드에서 남은 인원이 요청 인원 이하로 소진됨 — UI가 리셋 제안 */
  exhausted: boolean
}

export function drawStudents(options: {
  roster: string[]
  count: number
  /** 이미 뽑힌 학생 (중복 제외 모드에서 제외) */
  exclude?: string[]
  allowRepeat?: boolean
  seed: number
}): DrawResult {
  const roster = [...new Set(options.roster.filter((s) => s.trim()))]
  const count = Math.max(0, Math.floor(options.count))
  const rng = mulberry32(options.seed)

  if (roster.length === 0 || count === 0) {
    return { picked: [], exhausted: roster.length === 0 }
  }

  if (options.allowRepeat) {
    const picked = Array.from(
      { length: count },
      () => roster[Math.floor(rng() * roster.length)]!,
    )
    return { picked, exhausted: false }
  }

  const exclude = new Set(options.exclude ?? [])
  const pool = roster.filter((s) => !exclude.has(s))
  const picked = seededShuffle(pool, rng).slice(0, count)
  return { picked, exhausted: pool.length <= count }
}
