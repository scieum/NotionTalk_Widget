import { Check, Database, Link2, LogIn, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { API_BASE } from '../lib/api'

/**
 * Notion DB 연결 창 — 세 용도로 공용:
 * - record: 뽀모도로 기록 DB (필수 속성 매핑 검증 + 위젯 토큰 발급)
 * - roster: 수업 도구 명렬표 (제목 속성만 있으면 됨, 토큰 발급 없음)
 * - places: 지도 장소 DB (제목+주소 속성, 읽기 전용 위젯 토큰 발급)
 * - tasks: 할일 DB (제목+마감일+완료 속성, 읽기 전용 위젯 토큰 발급)
 * - gallery: 갤러리 DB (제목+파일과 미디어 속성, 읽기 전용 위젯 토큰 발급)
 * 모달 상단에서 Notion 계정 연결(OAuth 팝업)을 처리한다.
 */

export type DbPurpose = 'record' | 'roster' | 'places' | 'tasks' | 'gallery'

interface DatabaseSummary {
  id: string
  title: string
  icon: string | null
}

interface SessionInfo {
  /** 서버에 OAuth 설정이 있는지 (없으면 내부 토큰 모드) */
  oauth: boolean
  connected: boolean
  workspace: string | null
  serverToken: boolean
}

type Status = 'loading' | 'ready' | 'no-token' | 'error'

export interface DbSelection {
  dbId: string
  wt: string
}

/** 링크 또는 ID → 32자리 ID (실패 시 null) */
function extractDbId(text: string): string | null {
  const match = text.replace(/-/g, '').match(/[0-9a-fA-F]{32}/)
  return match ? match[0].toLowerCase() : null
}

function sameId(a: string, b: string): boolean {
  return a.replace(/-/g, '').toLowerCase() === b.replace(/-/g, '').toLowerCase()
}

function useNotionConnection() {
  const [status, setStatus] = useState<Status>('loading')
  const [databases, setDatabases] = useState<DatabaseSummary[]>([])
  const [session, setSession] = useState<SessionInfo | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const sessionRes = await fetch(`${API_BASE}/api/oauth/session`).catch(() => null)
      if (sessionRes?.ok) {
        const body = (await sessionRes.json()) as { ok: boolean } & SessionInfo
        if (body.ok) setSession(body)
      } else {
        setSession(null) // 로컬 Express 등 OAuth 미지원 환경
      }

      const res = await fetch(`${API_BASE}/api/notion/databases`)
      if (res.status === 503) {
        setStatus('no-token')
        setDatabases([])
        return
      }
      if (!res.ok) {
        setStatus('error')
        return
      }
      const body = (await res.json()) as { ok: boolean; databases?: DatabaseSummary[] }
      setDatabases(body.databases ?? [])
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { status, databases, session, reload: load }
}

/** OAuth 사용자의 DB 선택 → 위젯 토큰 발급. 미연결(내부 토큰 모드)이면 wt '' */
async function issueWidgetToken(
  connected: boolean,
  dbId: string,
  purpose: DbPurpose,
): Promise<{ wt: string } | { error: string }> {
  if (!connected || dbId === '') return { wt: '' }
  try {
    const tokenPurpose = purpose === 'record' ? 'record' : 'read'
    const res = await fetch(
      `${API_BASE}/api/widget-token?dbId=${dbId}&purpose=${tokenPurpose}`,
    )
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean
      wt?: string
      message?: string
    } | null
    if (!res.ok || !body?.ok || !body.wt) {
      return { error: body?.message ?? '위젯 토큰 발급 실패' }
    }
    return { wt: body.wt }
  } catch {
    return { error: '서버에 연결할 수 없어요.' }
  }
}

/** 뽀모도로 설정용 — 연결 상태 버튼 + 모달 */
export default function NotionDbPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (selection: DbSelection) => void
}) {
  const { databases, session } = useNotionConnection()
  const [open, setOpen] = useState(false)

  const connected = value !== '' ? databases.find((db) => sameId(db.id, value)) : undefined
  const statusText =
    value === ''
      ? session?.connected
        ? 'DB 선택 필요'
        : '서버 기본 DB'
      : connected
        ? `${connected.icon ? `${connected.icon} ` : ''}${connected.title}`
        : `ID ${value.slice(0, 8)}…`

  return (
    <>
      <label className="field">
        기록 DB
        <button type="button" className="db-connect" onClick={() => setOpen(true)}>
          <Database aria-hidden />
          <span className="db-connect__name">{statusText}</span>
          <span className="db-connect__action">{value === '' ? '연결' : '변경'}</span>
        </button>
      </label>

      {open && (
        <NotionDbModal
          purpose="record"
          value={value}
          onSelect={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

/** DB 연결 창 — 자체적으로 세션·목록을 불러오는 독립 모달 */
export function NotionDbModal({
  purpose,
  value,
  onSelect,
  onClose,
}: {
  purpose: DbPurpose
  value: string
  onSelect: (selection: DbSelection) => void
  onClose: () => void
}) {
  const { status, databases, session, reload } = useNotionConnection()
  const [manualText, setManualText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // OAuth 팝업 완료 신호 수신 → 세션·목록 갱신
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; ok?: boolean; message?: string | null }
      if (data?.type !== 'nwh:oauth') return
      if (data.ok) {
        setMessage(null)
        void reload()
      } else {
        setMessage(data.message ?? 'Notion 연결에 실패했어요.')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [reload])

  const openOAuth = () => {
    window.open(
      `${API_BASE}/api/oauth/start`,
      'nwh-notion-oauth',
      'width=560,height=720,menubar=no,toolbar=no',
    )
  }

  const disconnect = async () => {
    await fetch(`${API_BASE}/api/oauth/logout`, { method: 'POST' }).catch(() => null)
    void reload()
  }

  const select = async (dbId: string) => {
    if (purpose === 'roster') {
      onSelect({ dbId, wt: '' })
      onClose()
      return
    }
    setBusy(true)
    setMessage(null)
    const issued = await issueWidgetToken(Boolean(session?.connected), dbId, purpose)
    setBusy(false)
    if ('error' in issued) {
      setMessage(issued.error)
      return
    }
    onSelect({ dbId, wt: issued.wt })
    onClose()
  }

  const applyManual = async () => {
    const dbId = extractDbId(manualText)
    if (!dbId) {
      setMessage('링크 또는 32자리 ID를 붙여넣어 주세요.')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE}/api/notion/database?id=${dbId}`)
      const body = (await res.json()) as {
        ok: boolean
        message?: string
        mappingOk?: boolean
        mappingMessage?: string | null
      }
      if (!body.ok) {
        setMessage(body.message ?? 'DB 확인 실패')
        return
      }
      // 기록 DB만 필수 속성 매핑 필요 — 명렬표는 제목 속성만 있으면 된다
      if (purpose === 'record' && body.mappingOk === false) {
        setMessage(body.mappingMessage ?? '필수 속성이 부족합니다.')
        return
      }
      await select(dbId)
    } catch {
      setMessage('서버에 연결할 수 없어 확인하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  const oauthAvailable = session?.oauth === true
  const title =
    purpose === 'roster'
      ? 'Notion 명렬표 연결'
      : purpose === 'places'
        ? 'Notion 장소 DB 연결'
        : purpose === 'tasks'
          ? 'Notion 할일 DB 연결'
          : purpose === 'gallery'
            ? 'Notion 갤러리 DB 연결'
            : 'Notion DB 연결'

  // 파스텔 카드 안에서 열려도 카드 토큰(어두운 카드의 흰 글자 등)을 물려받지
  // 않도록 body에 portal — 모달은 항상 페이지 기본 토큰으로 그린다.
  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
            <X aria-hidden />
          </button>
        </div>

        <div className="modal__body">
          {oauthAvailable && (
            <div className="oauth-row">
              {session?.connected ? (
                <>
                  <span className="oauth-row__status">
                    내 Notion: <strong>{session.workspace ?? '연결됨'}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => void disconnect()}
                  >
                    연결 해제
                  </button>
                </>
              ) : (
                <>
                  <span className="oauth-row__status">
                    내 워크스페이스의 DB를 쓰려면 계정을 연결하세요.
                  </span>
                  <button type="button" className="btn btn--sm" onClick={openOAuth}>
                    <LogIn aria-hidden style={{ width: 13, height: 13 }} /> Notion 계정 연결
                  </button>
                </>
              )}
            </div>
          )}

          {status === 'loading' && <p className="tool__hint">DB 목록 불러오는 중…</p>}

          {status === 'no-token' && !session?.connected && (
            <p className="tool__error" style={{ fontSize: 12 }}>
              {oauthAvailable
                ? '위의 "Notion 계정 연결"로 시작하세요.'
                : '서버에 NOTION_TOKEN이 설정되지 않아 목록을 불러올 수 없어요. 아래에 링크/ID를 직접 입력할 수는 있습니다.'}
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
                {purpose === 'record' &&
                  !session?.connected &&
                  session?.serverToken !== false && (
                    <DbRow
                      selected={value === ''}
                      label="서버 기본 DB"
                      hint="서버 환경변수의 기본 기록 DB 사용"
                      onSelect={() => void select('')}
                    />
                  )}
                {databases.map((db) => (
                  <DbRow
                    key={db.id}
                    selected={value !== '' && sameId(db.id, value)}
                    label={`${db.icon ? `${db.icon} ` : ''}${db.title}`}
                    onSelect={() => void select(db.id)}
                  />
                ))}
              </div>

              {databases.length === 0 && (
                <p className="tool__hint">
                  {session?.connected
                    ? '인가된 페이지에서 데이터베이스를 찾지 못했어요. 아래 링크/ID로 직접 연결하거나, 연결 해제 후 다시 인가하며 DB가 있는 페이지를 선택하세요.'
                    : '접근 가능한 데이터베이스가 없습니다. Notion에서 DB 페이지의 ⋯ → 연결에서 통합을 추가하면 여기 나타나요.'}
                </p>
              )}

              <button
                type="button"
                className="btn btn--sm btn--ghost"
                disabled={busy}
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
                disabled={busy || !manualText.trim()}
                onClick={() => void applyManual()}
              >
                {busy ? '확인 중…' : '연결'}
              </button>
            </div>
            {message && (
              <p className="tool__hint" style={{ textAlign: 'left' }}>
                {message}
              </p>
            )}
          </div>

          <p className="db-help">
            {purpose === 'roster'
              ? '명렬표 DB의 제목 속성에서 학생 이름을 읽어옵니다. 번호(number) 속성이 있으면 번호순으로 정렬해요. 이름은 이 브라우저에만 저장되고 서버에 남지 않습니다.'
              : purpose === 'places'
                ? '장소 DB에는 제목 속성(장소 이름)과 "주소" 텍스트 속성이 필요합니다. 주소는 지도에 핀으로 표시돼요.'
                : purpose === 'tasks'
                  ? '할일 DB에는 제목 속성(할일)이 필요하고, 마감일(date)·완료 여부(checkbox 또는 status) 속성이 있으면 자동 인식합니다. 완료 상태는 읽기만 하고 Notion에 되쓰지 않아요.'
                  : purpose === 'gallery'
                    ? '갤러리 DB에는 제목 속성과 "파일과 미디어" 속성이 필요합니다. 한 행에 여러 파일이 있으면 각각 개별 카드로 보여주고, PDF는 바로 미리보기돼요.'
                : session?.connected
                ? '기록 DB에는 날짜(date)·분류(select)·시간(분)(number) 속성이 필요합니다. 임베드 위젯은 여기서 발급된 토큰으로 기록해요.'
                : '연결 창에 DB가 안 보이면: Notion에서 해당 DB 페이지를 열고 ⋯ 메뉴 → 연결 → 통합을 추가(공유)하세요. 필수 속성은 날짜(date)·분류(select)·시간(분)(number)입니다.'}
          </p>
        </div>
      </div>
    </div>,
    document.body,
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
