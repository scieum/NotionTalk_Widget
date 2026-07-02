import { describe, expect, it } from 'vitest'
import { assignSeats } from './seat'

const students = ['가', '나', '다', '라', '마', '바']

function flatten(seats: (string | null)[][]): string[] {
  return seats.flat().filter((s): s is string => s !== null)
}

describe('자리배정', () => {
  it('전원 배치 + 중복 학생·중복 칸 없음', () => {
    const r = assignSeats({
      rows: 3,
      cols: 3,
      disabled: [],
      students,
      seed: 42,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const placed = flatten(r.seats)
    expect(placed.sort()).toEqual([...students].sort())
  })

  it('같은 시드 = 같은 배치 (결정론)', () => {
    const opts = { rows: 3, cols: 3, disabled: [], students, seed: 7 }
    const a = assignSeats(opts)
    const b = assignSeats(opts)
    expect(a).toEqual(b)
  })

  it('비활성 칸은 사용하지 않는다', () => {
    const r = assignSeats({
      rows: 2,
      cols: 4,
      disabled: ['0,0', '1,3'],
      students,
      seed: 1,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.seats[0]![0]).toBeNull()
    expect(r.seats[1]![3]).toBeNull()
    expect(flatten(r.seats)).toHaveLength(6)
  })

  it('학생 수 > 가용 칸 → 명시적 실패', () => {
    const r = assignSeats({
      rows: 1,
      cols: 3,
      disabled: [],
      students,
      seed: 1,
    })
    expect(r).toEqual({ ok: false, reason: 'too-many-students' })
  })

  it('고정석이 지켜진다', () => {
    const r = assignSeats({
      rows: 3,
      cols: 3,
      disabled: [],
      students,
      seed: 3,
      constraints: { fixed: [{ student: '가', cell: '0,1' }] },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.seats[0]![1]).toBe('가')
  })

  it('고정석이 비활성 칸이면 실패', () => {
    const r = assignSeats({
      rows: 3,
      cols: 3,
      disabled: ['0,1'],
      students,
      seed: 3,
      constraints: { fixed: [{ student: '가', cell: '0,1' }] },
    })
    expect(r).toEqual({ ok: false, reason: 'fixed-cell-invalid' })
  })

  it('고정석 충돌(같은 칸 두 명) → 실패', () => {
    const r = assignSeats({
      rows: 3,
      cols: 3,
      disabled: [],
      students,
      seed: 3,
      constraints: {
        fixed: [
          { student: '가', cell: '0,0' },
          { student: '나', cell: '0,0' },
        ],
      },
    })
    expect(r).toEqual({ ok: false, reason: 'fixed-conflict' })
  })

  it('분리 조건이 지켜진다 (8방향 비이웃)', () => {
    const r = assignSeats({
      rows: 3,
      cols: 3,
      disabled: [],
      students,
      seed: 5,
      constraints: { apart: [['가', '나']] },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    let posA: [number, number] | null = null
    let posB: [number, number] | null = null
    r.seats.forEach((row, i) =>
      row.forEach((s, j) => {
        if (s === '가') posA = [i, j]
        if (s === '나') posB = [i, j]
      }),
    )
    expect(posA).not.toBeNull()
    expect(posB).not.toBeNull()
    const [ar, ac] = posA!
    const [br, bc] = posB!
    expect(Math.max(Math.abs(ar - br), Math.abs(ac - bc))).toBeGreaterThan(1)
  })

  it('물리적으로 불능인 분리 조건 → 상한 후 명시적 실패 (무한루프 없음)', () => {
    const r = assignSeats({
      rows: 1,
      cols: 2,
      disabled: [],
      students: ['가', '나'],
      seed: 1,
      constraints: { apart: [['가', '나']] },
      maxAttempts: 100,
    })
    expect(r).toEqual({ ok: false, reason: 'constraints-unsatisfiable' })
  })

  it('빈 명단 → 명시적 실패', () => {
    const r = assignSeats({
      rows: 2,
      cols: 2,
      disabled: [],
      students: ['  '],
      seed: 1,
    })
    expect(r).toEqual({ ok: false, reason: 'no-students' })
  })
})
