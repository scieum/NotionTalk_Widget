import type { RecordStats } from '@nwh/core'
import { API_BASE } from './api'

/**
 * 뽀모도로 → Notion 자동기록 클라이언트.
 * 쓰기 실패는 localStorage 대기열에 보관 후 재전송 (기록 유실 금지).
 */

const QUEUE_KEY = 'nwh:pomodoro:queue'

export interface SessionRecord {
  sessionId: string
  startedAt: string
  minutes: number
  category: string
  memo?: string
  dbId?: string
  /** 위젯 토큰 (OAuth 임베드 인증, sealed) */
  wt?: string
}

export function loadQueue(): SessionRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : []
  } catch {
    return []
  }
}

function saveQueue(queue: SessionRecord[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

async function postRecord(record: SessionRecord): Promise<void> {
  const res = await fetch(`${API_BASE}/api/pomodoro/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? `기록 실패 (${res.status})`)
  }
}

/**
 * 기록 전송 — 실패 시 대기열에 보관하고 오류 메시지를 반환.
 * 서버는 sessionId로 멱등 처리하므로 재전송이 중복 행을 만들지 않는다.
 */
export async function recordSession(record: SessionRecord): Promise<string | null> {
  try {
    await postRecord(record)
    return null
  } catch (err) {
    const queue = loadQueue()
    if (!queue.some((r) => r.sessionId === record.sessionId)) {
      saveQueue([...queue, record])
    }
    return err instanceof Error ? err.message : '기록 실패'
  }
}

/** 대기열 재전송 — 성공한 항목만 제거, 남은 개수 반환 */
export async function flushQueue(): Promise<number> {
  const queue = loadQueue()
  const remaining: SessionRecord[] = []
  for (const record of queue) {
    try {
      await postRecord(record)
    } catch {
      remaining.push(record)
    }
  }
  saveQueue(remaining)
  return remaining.length
}

export async function fetchStats(
  dbId: string,
  category: string,
  wt?: string,
): Promise<RecordStats | null> {
  try {
    const params = new URLSearchParams()
    if (dbId) params.set('dbId', dbId)
    if (category) params.set('category', category)
    if (wt) params.set('wt', wt)
    const res = await fetch(`${API_BASE}/api/pomodoro/stats?${params}`)
    if (!res.ok) return null
    const body = (await res.json()) as { ok: boolean; stats?: RecordStats }
    return body.ok ? (body.stats ?? null) : null
  } catch {
    return null // 서버 없음/오프라인 — 로컬 집계로 폴백
  }
}
