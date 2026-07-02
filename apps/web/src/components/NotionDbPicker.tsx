import { useEffect, useState } from 'react'
import { API_BASE } from '../lib/api'

/**
 * Notion 기록 DB 선택 — gallery-cover와 동일한 UX:
 * 통합에 연결된 DB 목록에서 선택 + 링크/ID 직접 입력 폴백.
 */

interface DatabaseSummary {
  id: string
  title: string
  icon: string | null
}

type Status = 'loading' | 'ready' | 'no-token' | 'error'

/** 링크 또는 ID → 32자리 ID (실패 시 null) */
function extractDbId(text: string): string | null {
  const match = text.replace(/-/g, '').match(/[0-9a-fA-F]{32}/)
  return match ? match[0].toLowerCase() : null
}

function sameId(a: string, b: string): boolean {
  return a.replace(/-/g, '').toLowerCase() === b.replace(/-/g, '').toLowerCase()
}

export default function NotionDbPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (dbId: string) => void
}) {
  const [status, setStatus] = useState<Status>('loading')
  const [databases, setDatabases] = useState<DatabaseSummary[]>([])
  const [manual, setManual] = useState(false)
  const [manualMessage, setManualMessage] = useState<string | null>(null)
  // "목록에서 선택"을 누르면, 현재 값이 목록에 없어도 강제로 드롭다운을 보여준다
  const [forceList, setForceList] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notion/databases`)
        if (cancelled) return
        if (res.status === 503) {
          setStatus('no-token')
          return
        }
        if (!res.ok) {
          setStatus('error')
          return
        }
        const body = (await res.json()) as { ok: boolean; databases?: DatabaseSummary[] }
        if (cancelled) return
        setDatabases(body.databases ?? [])
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const inList = value !== '' && databases.some((db) => sameId(db.id, value))
  const showManual =
    !forceList && (manual || (value !== '' && status === 'ready' && !inList))

  const validateManual = async (text: string) => {
    if (!text.trim()) {
      onChange('')
      setManualMessage(null)
      return
    }
    const dbId = extractDbId(text)
    if (!dbId) {
      setManualMessage('링크 또는 32자리 ID를 붙여넣어 주세요.')
      return
    }
    onChange(dbId)
    try {
      const res = await fetch(`${API_BASE}/api/notion/database?id=${dbId}`)
      const body = (await res.json()) as {
        ok: boolean
        message?: string
        database?: DatabaseSummary
        mappingOk?: boolean
        mappingMessage?: string | null
      }
      if (!body.ok) {
        setManualMessage(body.message ?? 'DB 확인 실패')
      } else if (body.mappingOk === false) {
        setManualMessage(body.mappingMessage ?? '필수 속성이 부족합니다.')
      } else {
        setManualMessage(`연결됨: ${body.database?.icon ?? ''} ${body.database?.title ?? ''}`)
      }
    } catch {
      setManualMessage('서버에 연결할 수 없어 확인하지 못했어요.')
    }
  }

  return (
    <>
      <label className="field">
        기록 DB
        {status === 'ready' && !showManual ? (
          <select
            value={inList ? databases.find((db) => sameId(db.id, value))!.id : ''}
            onChange={(e) => {
              setForceList(false)
              if (e.target.value === '__manual') {
                setManual(true)
              } else {
                onChange(e.target.value)
              }
            }}
          >
            <option value="">서버 기본 DB</option>
            {databases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.icon ? `${db.icon} ` : ''}
                {db.title}
              </option>
            ))}
            <option value="__manual">링크/ID 직접 입력…</option>
          </select>
        ) : (
          <input
            type="text"
            placeholder="링크 또는 32자리 ID"
            defaultValue={value}
            onBlur={(e) => void validateManual(e.target.value)}
          />
        )}
      </label>

      {showManual && status === 'ready' && (
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() => {
            setManual(false)
            setManualMessage(null)
            setForceList(true)
          }}
        >
          목록에서 선택
        </button>
      )}

      {manualMessage && (
        <p className="tool__hint" style={{ textAlign: 'left' }}>
          {manualMessage}
        </p>
      )}

      {status === 'no-token' && (
        <p className="tool__error" style={{ textAlign: 'left', fontSize: 12 }}>
          서버에 NOTION_TOKEN이 없어 목록을 불러올 수 없어요. Notion 내부 통합
          토큰을 서버 환경변수에 설정하고, Notion에서 통합을 기록 DB에
          연결(공유)하세요.
        </p>
      )}
      {status === 'ready' && databases.length === 0 && !showManual && (
        <p className="tool__hint" style={{ textAlign: 'left' }}>
          접근 가능한 데이터베이스가 없습니다. Notion에서 DB의 ⋯ → 연결에서
          통합을 추가하세요.
        </p>
      )}
      {status === 'error' && (
        <p className="tool__hint" style={{ textAlign: 'left' }}>
          서버에 연결할 수 없어요. 로컬에서는 <code>npm run dev:server</code>를
          실행하세요.
        </p>
      )}
    </>
  )
}
