import type { GalleryConfig } from '@nwh/core'
import { Database } from 'lucide-react'
import { useState } from 'react'
import CommonFields from '../../components/CommonFields'
import { NotionDbModal } from '../../components/NotionDbPicker'
import type { SettingsFormProps } from '../types'

export default function GallerySettings({
  config,
  onChange,
}: SettingsFormProps<GalleryConfig>) {
  const [dbOpen, setDbOpen] = useState(false)

  return (
    <>
      <label className="field">
        갤러리 DB
        <button type="button" className="db-connect" onClick={() => setDbOpen(true)}>
          <Database aria-hidden />
          <span className="db-connect__name">
            {config.dbId ? `ID ${config.dbId.slice(0, 8)}…` : '연결 안 함'}
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
        DB의 제목 + "파일과 미디어" 속성을 읽어 파일마다 개별 카드로 보여줍니다. PDF는
        바로 미리보기돼요.
      </p>

      <label className="field">
        열 수
        <select
          value={config.columns}
          onChange={(e) =>
            onChange({ ...config, columns: e.target.value as GalleryConfig['columns'] })
          }
        >
          <option value="auto">자동</option>
          <option value="2">2열</option>
          <option value="3">3열</option>
          <option value="4">4열</option>
        </select>
      </label>

      <label className="field">
        캡션(페이지 제목) 표시
        <input
          type="checkbox"
          checked={config.showCaption}
          onChange={(e) => onChange({ ...config, showCaption: e.target.checked })}
        />
      </label>

      <CommonFields config={config} onChange={onChange} />

      {dbOpen && (
        <NotionDbModal
          purpose="gallery"
          value={config.dbId}
          onSelect={({ dbId, wt }) => onChange({ ...config, dbId, wt })}
          onClose={() => setDbOpen(false)}
        />
      )}
    </>
  )
}
