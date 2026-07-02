import { useEffect, useState } from 'react'

/**
 * 현재 시각. 매 틱마다 new Date()로 다시 읽으므로(타임스탬프 기준)
 * setInterval 지연이 누적돼도 표시 시각은 드리프트하지 않는다.
 */
export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
