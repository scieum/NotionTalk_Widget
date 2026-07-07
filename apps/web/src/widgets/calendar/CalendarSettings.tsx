import type { CalendarConfig } from '@nwh/core'
import { Database } from 'lucide-react'
import { useState } from 'react'
import CommonFields from '../../components/CommonFields'
import FontSelect from '../../components/FontSelect'
import { NotionDbModal } from '../../components/NotionDbPicker'
import type { SettingsFormProps } from '../types'

export default function CalendarSettings({
  config,
  onChange,
}: SettingsFormProps<CalendarConfig>) {
  const [dbOpen, setDbOpen] = useState(false)

  return (
    <>
      <label className="field">
        주 시작 요일
        <select
          value={config.weekStart}
          onChange={(e) =>
            onChange({
              ...config,
              weekStart: e.target.value as CalendarConfig['weekStart'],
            })
          }
        >
          <option value="mon">월요일</option>
          <option value="sun">일요일</option>
        </select>
      </label>

      <label className="field">
        이전/다음 달 이동
        <input
          type="checkbox"
          checked={config.showNav}
          onChange={(e) => onChange({ ...config, showNav: e.target.checked })}
        />
      </label>

      <label className="field">
        할일 DB
        <button type="button" className="db-connect" onClick={() => setDbOpen(true)}>
          <Database aria-hidden />
          <span className="db-connect__name">
            {config.dbId ? `ID ${config.dbId.slice(0, 8)}…` : '연결 안 함 (표시형)'}
          </span>
          <span className="db-connect__action">{config.dbId ? '변경' : '연결'}</span>
        </button>
      </label>
      {config.dbId && (
        <>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => onChange({ ...config, dbId: '', wt: '' })}
          >
            DB 연결 해제
          </button>
          <label className="field">
            완료된 할일도 표시
            <input
              type="checkbox"
              checked={config.showDone}
              onChange={(e) => onChange({ ...config, showDone: e.target.checked })}
            />
          </label>
        </>
      )}
      <p className="tool__hint" style={{ textAlign: 'left' }}>
        할일 DB를 연결하면 마감일이 있는 날에 점이 찍히고, 날짜를 누르면 그날 할일이 아래에 뜹니다.
      </p>

      <FontSelect
        value={config.font}
        onChange={(font) => onChange({ ...config, font })}
      />

      <CommonFields config={config} onChange={onChange} />

      {dbOpen && (
        <NotionDbModal
          purpose="tasks"
          value={config.dbId}
          onSelect={({ dbId, wt }) => onChange({ ...config, dbId, wt })}
          onClose={() => setDbOpen(false)}
        />
      )}
    </>
  )
}
