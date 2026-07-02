import { Pencil, X } from 'lucide-react'
import { useEffect, useState } from 'react'
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
          <label>
            학생 ({draft.students.length}명 · 줄바꿈 또는 콤마 구분)
            <textarea
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
            명단은 이 브라우저에만 저장됩니다. 서버로 전송되지 않아요.
          </p>
        </div>
      )}
    </>
  )
}
