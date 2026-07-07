import type { TodoConfig } from '@nwh/core'
import { Database } from 'lucide-react'
import { useState } from 'react'
import CommonFields from '../../components/CommonFields'
import FontSelect from '../../components/FontSelect'
import { NotionDbModal } from '../../components/NotionDbPicker'
import type { SettingsFormProps } from '../types'

export default function TodoSettings({
  config,
  onChange,
}: SettingsFormProps<TodoConfig>) {
  const [dbOpen, setDbOpen] = useState(false)

  return (
    <>
      <label className="field">
        할일 DB
        <button type="button" className="db-connect" onClick={() => setDbOpen(true)}>
          <Database aria-hidden />
          <span className="db-connect__name">
            {config.dbId ? `ID ${config.dbId.slice(0, 8)}…` : '연결 필요'}
          </span>
          <span className="db-connect__action">{config.dbId ? '변경' : '연결'}</span>
        </button>
      </label>
      {config.dbId && (
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() => onChange({ ...config, dbId: '', wt: '' })}
        >
          DB 연결 해제
        </button>
      )}
      <p className="tool__hint" style={{ textAlign: 'left' }}>
        DB의 제목(할일) + 마감일(date) + 완료 여부(checkbox·status)를 읽어 목록으로 보여줍니다. 읽기 전용이에요.
      </p>

      <label className="field">
        완료된 할일
        <select
          value={config.completed}
          onChange={(e) =>
            onChange({ ...config, completed: e.target.value as TodoConfig['completed'] })
          }
        >
          <option value="show">흐리게 표시</option>
          <option value="hide">숨김</option>
        </select>
      </label>

      <label className="field">
        마감일 기준으로 묶기
        <input
          type="checkbox"
          checked={config.groupByDate}
          onChange={(e) => onChange({ ...config, groupByDate: e.target.checked })}
        />
      </label>

      <label className="field">
        제목 표시
        <input
          type="checkbox"
          checked={config.showTitle}
          onChange={(e) => onChange({ ...config, showTitle: e.target.checked })}
        />
      </label>

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
