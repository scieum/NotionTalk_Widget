import type { CalendarConfig } from '@nwh/core'
import CommonFields from '../../components/CommonFields'
import type { SettingsFormProps } from '../types'

export default function CalendarSettings({
  config,
  onChange,
}: SettingsFormProps<CalendarConfig>) {
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

      <CommonFields config={config} onChange={onChange} />
    </>
  )
}
