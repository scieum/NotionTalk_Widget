import { Check, Database, Link2, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { API_BASE } from '../lib/api'

/**
 * Notion 기록 DB 연결 — 설정 폼에는 연결 상태 + 버튼만 두고,
 * 실제 선택은 별도 연결 창(모달)에서 한다:
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

function useDatabases() {
  const [status, setStatus] = useState<Status>('loading')
  const [databases, setDatabases] = useState<DatabaseSummary[]>([])

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch(`${API_BASE}/api/notion/databases`)
      if (res.status === 503) {
        setStatus('no-token')
        return
      }
      if (!res.ok) {
        setStatus('error')
        return
      }
      const body = (await res.json()) as {
        ok: boolean
        databases?: DatabaseSummary[]
      }
      setDatabases(body.databases ?? [])
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { status, databases, reload: load }
}

export default function NotionDbPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (dbId: string) => void
}) {
  const { status, databases, reload } = useDatabases()
  const [open, setOpen] = useState(false)

  const connected = value !== '' ? databases.find((db) => sameId(db.id, value)) : undefined
  const statusText =
    value === ''
      ? '서버 기본 DB'
      : connected
        ? `${connected.icon ? `${connected.icon} ` : ''}${connected.title}`
        : `ID ${value.slice(0, 8)}…`

  return (
    <>
      <label className="field">
        기록 DB
        <button
          type="button"
          className="db-connect"
          onClick={() => setOpen(true)}
        >
          <Database aria-hidden />
          <span className="db-connect__name">{statusText}</span>
          <span className="db-connect__action">{value === '' ? '연결' : '변경'}</span>
        </button>
      </label>

      {status === 'no-token' && (
        <p className="tool__error" style={{ textAlign: 'left', fontSize: 12 }}>
          서버에 NOTION_TOKEN이 없어 목록을 불러올 수 없어요. Notion 내부 통합
          토큰을 서버 환경변수에 설정하고, Notion에서 통합을 기록 DB에
          연결(공유)하세요.
        </p>
      )}

      {open && (
        <ConnectModal
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
          status={status}
          databases={databases}
          reload={reload}
        />
      )}
    </>
  )
}

function ConnectModal({
  value,
  onChange,
  onClose,
  status,
  databases,
  reload,
}: {
  value: string
  onChange: (dbId: string) => void
  onClose: () => void
  status: Status
  databases: DatabaseSummary[]
  reload: () => Promise<void>
}) {
  const [manualText, setManualText] = useState('')
  const [manualMessage, setManualMessage] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const applyManual = async () => {
    const dbId = extractDbId(manualText)
    if (!dbId) {
      setManualMessage('링크 또는 32자리 ID를 붙여넣어 주세요.')
      return
    }
    setChecking(true)
    setManualMessage(null)
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
        onChange(dbId)
        setManualMessage(
          `연결됨: ${body.database?.icon ?? ''} ${body.database?.title ?? ''}`,
        )
      }
    } catch {
      // 서버 확인은 실패해도 연결 자체는 진행 — 기록 시점에 다시 검증된다
      onChange(dbId)
      setManualMessage('서버에 연결할 수 없어 확인 없이 저장했어요.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Notion DB 연결">
        <div className="modal__header">
          <h3>Notion DB 연결</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
            <X aria-hidden />
          </button>
        </div>

        <div className="modal__body">
          {status === 'loading' && <p className="tool__hint">DB 목록 불러오는 중…</p>}

          {status === 'no-token' && (
            <p className="tool__error" style={{ fontSize: 12 }}>
              서버에 NOTION_TOKEN이 설정되지 않아 목록을 불러올 수 없어요.
              아래에 링크/ID를 직접 입력할 수는 있습니다.
            </p>
          )}
          {status === 'error' && (
            <p className="tool__hint">
              서버에 연결할 수 없어요. 로컬에서는 <code>npm run dev:server</code>를 실행하세요.
            </p>
          )}

          {status === 'ready' && (
            <>
              <div className="db-list">
                <DbRow
                  selected={value === ''}
                  label="서버 기본 DB"
                  hint="서버 환경변수의 기본 기록 DB 사용"
                  onSelect={() => {
                    onChange('')
                    onClose()
                  }}
                />
                {databases.map((db) => (
                  <DbRow
                    key={db.id}
                    selected={value !== '' && sameId(db.id, value)}
                    label={`${db.icon ? `${db.icon} ` : ''}${db.title}`}
                    onSelect={() => {
                      onChange(db.id)
                      onClose()
                    }}
                  />
                ))}
              </div>

              {databases.length === 0 && (
                <p className="tool__hint">
                  접근 가능한 데이터베이스가 없습니다. Notion에서 DB 페이지의
                  ⋯ → 연결에서 통합을 추가하면 여기 나타나요.
                </p>
              )}

              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => void reload()}
              >
                <RefreshCw aria-hidden style={{ width: 13, height: 13 }} /> 목록 새로고침
              </button>
            </>
          )}

          <div className="db-manual">
            <div className="db-manual__label">
              <Link2 aria-hidden /> 링크/ID 직접 입력
            </div>
            <div className="db-manual__row">
              <input
                type="text"
                placeholder="Notion DB 링크 또는 32자리 ID"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void applyManual()
                  }
                }}
              />
              <button
                type="button"
                className="btn btn--sm"
                disabled={checking || !manualText.trim()}
                onClick={() => void applyManual()}
              >
                {checking ? '확인 중…' : '연결'}
              </button>
            </div>
            {manualMessage && (
              <p className="tool__hint" style={{ textAlign: 'left' }}>
                {manualMessage}
              </p>
            )}
          </div>

          <p className="db-help">
            연결 창에 DB가 안 보이면: Notion에서 해당 DB 페이지를 열고
            ⋯ 메뉴 → 연결 → 통합을 추가(공유)하세요. 필수 속성은
            날짜(date)·분류(select)·시간(분)(number)입니다.
          </p>
        </div>
      </div>
    </div>
  )
}

function DbRow({
  selected,
  label,
  hint,
  onSelect,
}: {
  selected: boolean
  label: string
  hint?: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`db-row${selected ? ' db-row--selected' : ''}`}
      onClick={onSelect}
    >
      <span className="db-row__label">
        {label}
        {hint && <span className="db-row__hint">{hint}</span>}
      </span>
      {selected && <Check className="db-row__check" aria-label="선택됨" />}
    </button>
  )
}
