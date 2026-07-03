import { Database, Pencil, RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { API_BASE } from '../lib/api'
import { NotionDbModal } from './NotionDbPicker'
import {
  deleteRoster,
  emptyRoster,
  formatApart,
  formatFixed,
  getLastRosterId,
  listRosters,
  MAX_ROSTERS,
  parseApart,
  parseFixed,
  parseStudents,
  saveRoster,
  setLastRosterId,
  type RosterPreset,
} from '../lib/roster'

/**
 * 명단 선택/편집 패널 — 자리뽑기·랜덤뽑기 공용.
 * 명단은 localStorage 프리셋으로만 관리 (URL·서버 금지 기본).
 */
export default function RosterPanel({
  onRoster,
  showConstraints = false,
}: {
  onRoster: (roster: RosterPreset | null) => void
  showConstraints?: boolean
}) {
  const [rosters, setRosters] = useState<RosterPreset[]>(listRosters)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const last = getLastRosterId()
    const all = listRosters()
    if (last && all.some((r) => r.id === last)) return last
    return all[0]?.id ?? null
  })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<RosterPreset | null>(null)
  const [dbPickerOpen, setDbPickerOpen] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  // Notion 불러오기로 students가 바뀌면 textarea(비제어)를 강제 리마운트
  const [importNonce, setImportNonce] = useState(0)

  /** Notion 명렬표 DB → 학생 이름 (서버는 통과만, 저장은 이 브라우저에만) */
  const importFromNotion = async (dbId: string) => {
    setImportMsg('명단 불러오는 중…')
    try {
      const res = await fetch(`${API_BASE}/api/notion/roster?id=${dbId}`)
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean
        students?: string[]
        database?: { title?: string }
        message?: string
      } | null
      if (!body?.ok || !Array.isArray(body.students)) {
        setImportMsg(body?.message ?? '명단을 불러오지 못했어요.')
        return
      }
      if (body.students.length === 0) {
        setImportMsg('명렬표에서 학생 이름을 찾지 못했어요. 제목 속성에 이름이 있어야 해요.')
        return
      }
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              students: body.students!,
              notionDbId: dbId,
              name:
                prev.name === '새 명단' && body.database?.title
                  ? body.database.title
                  : prev.name,
            }
          : prev,
      )
      setImportNonce((n) => n + 1)
      setImportMsg(`${body.students.length}명 불러왔어요. 저장을 눌러 확정하세요.`)
    } catch {
      setImportMsg('서버에 연결할 수 없어요.')
    }
  }

  const selected = rosters.find((r) => r.id === selectedId) ?? null

  useEffect(() => {
    onRoster(selected)
    if (selected) setLastRosterId(selected.id)
    // onRoster는 위젯의 setState — 선택 변경 시에만 알리면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, rosters])

  const startEdit = (base?: RosterPreset) => {
    setDraft(base ? { ...base } : emptyRoster())
    setEditing(true)
  }

  const save = () => {
    if (!draft) return
    if (!saveRoster(draft)) {
      window.alert(`명단 프리셋은 최대 ${MAX_ROSTERS}개까지 저장할 수 있어요.`)
      return
    }
    setRosters(listRosters())
    setSelectedId(draft.id)
    setEditing(false)
  }

  const remove = () => {
    if (!draft) return
    if (!window.confirm(`'${draft.name}' 명단을 삭제할까요?`)) return
    deleteRoster(draft.id)
    const remainingRosters = listRosters()
    setRosters(remainingRosters)
    setSelectedId(remainingRosters[0]?.id ?? null)
    setEditing(false)
  }

  return (
    <>
      <div className="roster-bar">
        <select
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value || null)}
          aria-label="명단 프리셋"
        >
          {rosters.length === 0 && <option value="">명단 없음</option>}
          {rosters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.students.length}명)
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() => (selected ? startEdit(selected) : startEdit())}
        >
          <Pencil size={13} aria-hidden />
          {selected ? '편집' : '명단 만들기'}
        </button>
        {selected && (
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => startEdit()}
          >
            새 명단
          </button>
        )}
      </div>

      {editing && draft && (
        <div className="roster-editor">
          <label>
            명단 이름
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          <div className="tool__controls" style={{ justifyContent: 'flex-start' }}>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setDbPickerOpen(true)}
            >
              <Database size={13} aria-hidden /> Notion 명렬표에서 불러오기
            </button>
            {draft.notionDbId && (
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => void importFromNotion(draft.notionDbId!)}
              >
                <RefreshCw size={13} aria-hidden /> 다시 불러오기
              </button>
            )}
          </div>
          {importMsg && (
            <p className="tool__hint" style={{ textAlign: 'left' }}>
              {importMsg}
            </p>
          )}
          <label>
            학생 ({draft.students.length}명 · 줄바꿈 또는 콤마 구분)
            <textarea
              key={`students-${importNonce}`}
              defaultValue={draft.students.join('\n')}
              onChange={(e) =>
                setDraft({ ...draft, students: parseStudents(e.target.value) })
              }
              rows={4}
            />
          </label>
          {showConstraints && (
            <>
              <label>
                고정석 — 한 줄에 하나, <code>이름=행,열</code> (1부터)
                <textarea
                  defaultValue={formatFixed(draft.fixed)}
                  onChange={(e) =>
                    setDraft({ ...draft, fixed: parseFixed(e.target.value) })
                  }
                  rows={2}
                />
              </label>
              <label>
                떨어뜨리기 — 한 줄에 한 쌍, <code>이름1,이름2</code>
                <textarea
                  defaultValue={formatApart(draft.apart)}
                  onChange={(e) =>
                    setDraft({ ...draft, apart: parseApart(e.target.value) })
                  }
                  rows={2}
                />
              </label>
            </>
          )}
          <div className="tool__controls">
            <button type="button" className="btn btn--sm" onClick={save}>
              저장
            </button>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setEditing(false)}
            >
              <X size={13} aria-hidden />
              닫기
            </button>
            {rosters.some((r) => r.id === draft.id) && (
              <button type="button" className="btn btn--sm btn--danger" onClick={remove}>
                삭제
              </button>
            )}
          </div>
          <p className="tool__hint">
            명단은 이 브라우저에만 저장됩니다. Notion에서 불러올 때도 서버에
            저장되지 않아요.
          </p>
        </div>
      )}

      {dbPickerOpen && draft && (
        <NotionDbModal
          purpose="roster"
          value={draft.notionDbId ?? ''}
          onSelect={({ dbId }) => void importFromNotion(dbId)}
          onClose={() => setDbPickerOpen(false)}
        />
      )}
    </>
  )
}
