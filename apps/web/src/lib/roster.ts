/**
 * 학생 명단 프리셋 — 개인정보이므로 localStorage 완결 (서버 전송·URL 금지 기본).
 * 프리셋 최대 10개 (정책 수치).
 */

const KEY = 'nwh:rosters'
const LAST_KEY = 'nwh:rosters:last'
export const MAX_ROSTERS = 10

export interface RosterPreset {
  id: string
  name: string
  students: string[]
  /** 고정석 — cell은 "행,열" (0부터) */
  fixed: { student: string; cell: string }[]
  /** 분리(이웃 금지) 쌍 */
  apart: [string, string][]
  /** 명단을 불러온 Notion 명렬표 DB (다시 불러오기용) — ID만, 이름은 저장 안 함 */
  notionDbId?: string
}

export function emptyRoster(): RosterPreset {
  return {
    id: crypto.randomUUID(),
    name: '새 명단',
    students: [],
    fixed: [],
    apart: [],
  }
}

function isPreset(v: unknown): v is RosterPreset {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    Array.isArray(o.students) &&
    Array.isArray(o.fixed) &&
    Array.isArray(o.apart)
  )
}

export function listRosters(): RosterPreset[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isPreset)
  } catch {
    return []
  }
}

/** 저장(추가 또는 교체). 신규가 상한을 넘으면 false. */
export function saveRoster(preset: RosterPreset): boolean {
  const rosters = listRosters()
  const index = rosters.findIndex((r) => r.id === preset.id)
  if (index >= 0) {
    rosters[index] = preset
  } else {
    if (rosters.length >= MAX_ROSTERS) return false
    rosters.push(preset)
  }
  localStorage.setItem(KEY, JSON.stringify(rosters))
  return true
}

export function deleteRoster(id: string): void {
  localStorage.setItem(
    KEY,
    JSON.stringify(listRosters().filter((r) => r.id !== id)),
  )
}

export function getLastRosterId(): string | null {
  return localStorage.getItem(LAST_KEY)
}

export function setLastRosterId(id: string): void {
  localStorage.setItem(LAST_KEY, id)
}

/** 텍스트 → 명단 (줄바꿈/콤마 구분, 공백·중복 제거) */
export function parseStudents(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ]
}

/** "이름=행,열" 줄들 → 고정석 (입력은 1부터, 저장은 0부터) */
export function parseFixed(text: string): { student: string; cell: string }[] {
  const result: { student: string; cell: string }[] = []
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^(.+?)\s*=\s*(\d+)\s*,\s*(\d+)$/)
    if (!m) continue
    const r = Number(m[2]) - 1
    const c = Number(m[3]) - 1
    if (r >= 0 && c >= 0) result.push({ student: m[1]!.trim(), cell: `${r},${c}` })
  }
  return result
}

export function formatFixed(fixed: { student: string; cell: string }[]): string {
  return fixed
    .map(({ student, cell }) => {
      const [r, c] = cell.split(',').map(Number)
      return `${student}=${(r ?? 0) + 1},${(c ?? 0) + 1}`
    })
    .join('\n')
}

/** "이름1,이름2" 줄들 → 분리 쌍 */
export function parseApart(text: string): [string, string][] {
  const result: [string, string][] = []
  for (const line of text.split('\n')) {
    const parts = line.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length === 2) result.push([parts[0]!, parts[1]!])
  }
  return result
}

export function formatApart(apart: [string, string][]): string {
  return apart.map(([a, b]) => `${a},${b}`).join('\n')
}
