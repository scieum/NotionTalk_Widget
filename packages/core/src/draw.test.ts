import { describe, expect, it } from 'vitest'
import { drawStudents } from './draw'

const roster = ['가', '나', '다', '라', '마']

describe('랜덤 추첨', () => {
  it('요청 인원만큼 뽑고 중복이 없다 (중복 제외 모드)', () => {
    const r = drawStudents({ roster, count: 3, seed: 1 })
    expect(r.picked).toHaveLength(3)
    expect(new Set(r.picked).size).toBe(3)
    expect(r.exhausted).toBe(false)
    r.picked.forEach((s) => expect(roster).toContain(s))
  })

  it('같은 시드 = 같은 결과 (결정론)', () => {
    const a = drawStudents({ roster, count: 2, seed: 9 })
    const b = drawStudents({ roster, count: 2, seed: 9 })
    expect(a).toEqual(b)
  })

  it('이미 뽑힌 학생은 제외된다', () => {
    const r = drawStudents({
      roster,
      count: 2,
      exclude: ['가', '나', '다'],
      seed: 2,
    })
    expect(r.picked).toHaveLength(2)
    r.picked.forEach((s) => expect(['라', '마']).toContain(s))
    expect(r.exhausted).toBe(true) // 풀 소진
  })

  it('남은 인원 < 요청 인원이면 남은 전원 + exhausted (에러 아님)', () => {
    const r = drawStudents({
      roster,
      count: 3,
      exclude: ['가', '나', '다', '라'],
      seed: 2,
    })
    expect(r.picked).toEqual(['마'])
    expect(r.exhausted).toBe(true)
  })

  it('중복 허용 모드는 항상 요청 인원을 채운다', () => {
    const r = drawStudents({
      roster: ['가', '나'],
      count: 5,
      allowRepeat: true,
      seed: 3,
    })
    expect(r.picked).toHaveLength(5)
    expect(r.exhausted).toBe(false)
  })

  it('빈 명단 → 빈 결과 + exhausted', () => {
    const r = drawStudents({ roster: [], count: 1, seed: 1 })
    expect(r).toEqual({ picked: [], exhausted: true })
  })

  it('명단의 공백·중복 항목은 정리된다', () => {
    const r = drawStudents({
      roster: ['가', '가', ' ', '나'],
      count: 10,
      seed: 1,
    })
    expect(r.picked.sort()).toEqual(['가', '나'])
  })
})
