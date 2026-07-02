import { mulberry32, seededShuffle } from './prng'

/**
 * 자리배정 — 시드 셔플 + 제약 충족. 제약 불능 시 명시적 실패 반환
 * (throw·무한루프 금지, 시도 상한 기본 1,000회).
 */

export interface SeatConstraints {
  /** 고정석 — 학생을 특정 칸("행,열", 0부터)에 고정 */
  fixed: { student: string; cell: string }[]
  /** 분리 — 두 학생을 이웃(8방향) 금지 */
  apart: [string, string][]
}

export type SeatFailReason =
  | 'no-students'
  | 'too-many-students'
  | 'fixed-cell-invalid'
  | 'fixed-conflict'
  | 'constraints-unsatisfiable'

export type SeatResult =
  | { ok: true; seats: (string | null)[][]; attempts: number }
  | { ok: false; reason: SeatFailReason }

function cellKey(r: number, c: number): string {
  return `${r},${c}`
}

function neighbors(r: number, c: number): string[] {
  const result: string[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr !== 0 || dc !== 0) result.push(cellKey(r + dr, c + dc))
    }
  }
  return result
}

function violatesApart(
  seats: (string | null)[][],
  apart: [string, string][],
): boolean {
  if (apart.length === 0) return false
  const cellOf = new Map<string, [number, number]>()
  seats.forEach((row, r) =>
    row.forEach((student, c) => {
      if (student) cellOf.set(student, [r, c])
    }),
  )
  for (const [a, b] of apart) {
    const posA = cellOf.get(a)
    const posB = cellOf.get(b)
    if (!posA || !posB) continue // 미배치 학생이 낀 조건은 무시
    if (neighbors(posA[0], posA[1]).includes(cellKey(posB[0], posB[1]))) {
      return true
    }
  }
  return false
}

export function assignSeats(options: {
  rows: number
  cols: number
  /** 사용 안 하는 칸 — "행,열" */
  disabled: string[]
  students: string[]
  constraints?: Partial<SeatConstraints>
  seed: number
  maxAttempts?: number
}): SeatResult {
  const { rows, cols, seed } = options
  const students = [...new Set(options.students.filter((s) => s.trim()))]
  const disabled = new Set(options.disabled)
  const fixed = options.constraints?.fixed ?? []
  const apart = options.constraints?.apart ?? []
  const maxAttempts = options.maxAttempts ?? 1000

  if (students.length === 0) return { ok: false, reason: 'no-students' }

  // 가용 칸 (행 우선 순서)
  const activeCells: string[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!disabled.has(cellKey(r, c))) activeCells.push(cellKey(r, c))
    }
  }
  if (students.length > activeCells.length) {
    return { ok: false, reason: 'too-many-students' }
  }

  // 고정석 검증 — 명단에 있는 학생만 유효, 칸은 격자 안 + 활성 + 중복 금지
  const fixedByCell = new Map<string, string>()
  const fixedStudents = new Set<string>()
  for (const { student, cell } of fixed) {
    if (!students.includes(student)) continue
    if (!activeCells.includes(cell)) {
      return { ok: false, reason: 'fixed-cell-invalid' }
    }
    if (fixedByCell.has(cell) || fixedStudents.has(student)) {
      return { ok: false, reason: 'fixed-conflict' }
    }
    fixedByCell.set(cell, student)
    fixedStudents.add(student)
  }

  const freeStudents = students.filter((s) => !fixedStudents.has(s))
  const freeCells = activeCells.filter((cell) => !fixedByCell.has(cell))
  const rng = mulberry32(seed)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const shuffledStudents = seededShuffle(freeStudents, rng)
    const shuffledCells = seededShuffle(freeCells, rng)

    const seats: (string | null)[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => null),
    )
    const place = (cell: string, student: string) => {
      const [r, c] = cell.split(',').map(Number) as [number, number]
      seats[r]![c] = student
    }
    fixedByCell.forEach((student, cell) => place(cell, student))
    shuffledStudents.forEach((student, i) => place(shuffledCells[i]!, student))

    if (!violatesApart(seats, apart)) {
      return { ok: true, seats, attempts: attempt }
    }
  }

  return { ok: false, reason: 'constraints-unsatisfiable' }
}
