import { describe, expect, it } from 'vitest'
import { generateLadder, traceLadder } from './ladder'

describe('사다리 생성', () => {
  it('같은 층에 이웃 가로줄이 없다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const spec = generateLadder(8, 12, seed)
      for (const row of spec.rungs) {
        for (let c = 1; c < row.length; c++) {
          expect(row[c] && row[c - 1]).toBe(false)
        }
      }
    }
  })

  it('동일 시드는 동일 사다리 (결정론)', () => {
    expect(generateLadder(6, 10, 42)).toEqual(generateLadder(6, 10, 42))
  })

  it('최소 크기 보정 (cols 2, rows 3 미만 입력)', () => {
    const spec = generateLadder(1, 0, 7)
    expect(spec.cols).toBe(2)
    expect(spec.rows).toBe(3)
  })
})

describe('사다리 추적', () => {
  it('시작→끝 매핑이 전단사 (같은 결과로 두 명이 도착하지 않음)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const cols of [2, 3, 5, 8, 12]) {
        const spec = generateLadder(cols, 10, seed)
        const ends = Array.from({ length: cols }, (_, c) => traceLadder(spec, c).end)
        expect(new Set(ends).size, `cols=${cols} seed=${seed}`).toBe(cols)
      }
    }
  })

  it('경로 길이 = rows + 1, 시작 위치 포함', () => {
    const spec = generateLadder(5, 9, 3)
    const trace = traceLadder(spec, 2)
    expect(trace.path).toHaveLength(10)
    expect(trace.path[0]).toBe(2)
    expect(trace.path[trace.path.length - 1]).toBe(trace.end)
  })

  it('경로의 각 스텝은 최대 1칸 이동', () => {
    const spec = generateLadder(7, 12, 11)
    for (let c = 0; c < 7; c++) {
      const { path } = traceLadder(spec, c)
      for (let i = 1; i < path.length; i++) {
        expect(Math.abs(path[i]! - path[i - 1]!)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('범위 밖 시작 위치는 경계로 보정', () => {
    const spec = generateLadder(4, 8, 5)
    expect(traceLadder(spec, -3).path[0]).toBe(0)
    expect(traceLadder(spec, 99).path[0]).toBe(3)
  })
})
