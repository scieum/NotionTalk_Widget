import { API_BASE } from './api'

/**
 * 할일 목록 읽기 — 캘린더/할일 위젯 공용.
 * 서버(api/notion/resource?resource=tasks)가 DB의 제목 + 마감일 + 완료 여부를 통과시키면
 * 여기서 날짜 키 정규화·정렬만 담당한다(읽기 전용, Notion 역기록 없음).
 */

export interface Task {
  title: string
  /** Notion date.start 원문 (날짜 또는 날짜시간) — 없으면 null */
  date: string | null
  done: boolean
}

export type TasksResult =
  | { ok: true; tasks: Task[] }
  | { ok: false; message: string }

export async function fetchTasks(dbId: string, wt: string): Promise<TasksResult> {
  try {
    const params = new URLSearchParams({ resource: 'tasks', id: dbId })
    if (wt) params.set('wt', wt)
    const res = await fetch(`${API_BASE}/api/notion/resource?${params}`)
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean
      tasks?: Task[]
      message?: string
    } | null
    if (!body?.ok || !Array.isArray(body.tasks)) {
      return { ok: false, message: body?.message ?? '할일을 불러오지 못했어요.' }
    }
    return { ok: true, tasks: body.tasks }
  } catch {
    return { ok: false, message: '서버에 연결할 수 없어요.' }
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 로컬 달력 날짜 키 (YYYY-MM-DD) — 캘린더 셀 매칭용 */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Notion date.start → 로컬 날짜 키. 날짜만(예 2026-07-07)이면 그대로,
 * 시각 포함(타임존)이면 로컬 날짜로 변환한다. 파싱 실패 시 null.
 */
export function taskDateKey(iso: string | null): string | null {
  if (!iso) return null
  if (!iso.includes('T')) {
    return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null
  }
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : localDateKey(d)
}

/** 마감일 오름차순(무날짜 뒤) + 완료 뒤로 — 목록 표시 순서 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const ka = taskDateKey(a.date)
    const kb = taskDateKey(b.date)
    if (ka === kb) return 0
    if (!ka) return 1
    if (!kb) return -1
    return ka < kb ? -1 : 1
  })
}
