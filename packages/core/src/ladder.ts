import { mulberry32 } from './prng'

/**
 * 사다리타기 — 순수함수. 그리기·경로 애니메이션은 UI 몫, 여기는 구조와 결과만.
 * rungs[r][c] = r번째 가로줄 층에서 기둥 c와 c+1 사이에 가로줄이 있는지.
 * 같은 층에서 이웃한 가로줄은 금지(교차 모호성 방지).
 */

export interface LadderSpec {
  cols: number
  rows: number
  rungs: boolean[][]
}

export function generateLadder(cols: number, rows: number, seed: number): LadderSpec {
  const safeCols = Math.max(2, Math.floor(cols))
  const safeRows = Math.max(3, Math.floor(rows))
  const rng = mulberry32(seed)

  const rungs: boolean[][] = []
  for (let r = 0; r < safeRows; r++) {
    const row: boolean[] = []
    for (let c = 0; c < safeCols - 1; c++) {
      // 이웃 가로줄 금지 — 왼쪽에 놓았으면 이번 칸은 건너뛴다
      const blocked = c > 0 && row[c - 1] === true
      row.push(!blocked && rng() < 0.42)
    }
    rungs.push(row)
  }

  // 어떤 기둥도 가로줄 없이 수직 낙하만 하지 않게 — 빈 기둥에 가로줄 보강
  for (let c = 0; c < safeCols - 1; c++) {
    const touched = rungs.some((row) => row[c] === true || (c > 0 && row[c - 1] === true))
    if (!touched) {
      const r = Math.floor(rng() * safeRows)
      const leftFree = c === 0 || rungs[r]![c - 1] !== true
      const rightFree = c >= safeCols - 2 || rungs[r]![c + 1] !== true
      if (leftFree && rightFree) rungs[r]![c] = true
    }
  }

  return { cols: safeCols, rows: safeRows, rungs }
}

export interface LadderTrace {
  end: number
  /** 각 층을 지난 뒤의 기둥 위치 (애니메이션 폴리라인용) — 길이 rows+1, 첫 값은 start */
  path: number[]
}

export function traceLadder(spec: LadderSpec, start: number): LadderTrace {
  let col = Math.min(Math.max(0, Math.floor(start)), spec.cols - 1)
  const path: number[] = [col]
  for (let r = 0; r < spec.rows; r++) {
    const row = spec.rungs[r] ?? []
    if (row[col] === true) col += 1
    else if (col > 0 && row[col - 1] === true) col -= 1
    path.push(col)
  }
  return { end: col, path }
}
