import type { RandomPickerConfig } from '@nwh/core'
import CommonFields from '../../components/CommonFields'
import type { SettingsFormProps } from '../types'

export default function RandomPickerSettings({
  config,
  onChange,
}: SettingsFormProps<RandomPickerConfig>) {
  return (
    <>
      <label className="field">
        추첨 연출
        <select
          value={config.visual}
          onChange={(e) =>
            onChange({ ...config, visual: e.target.value as RandomPickerConfig['visual'] })
          }
        >
          <option value="text">이름 롤링</option>
          <option value="roulette">룰렛 휠</option>
          <option value="claw">인형뽑기</option>
        </select>
      </label>
      <label className="field">
        한 번에 뽑을 인원
        <input
          type="number"
          min={1}
          max={30}
          value={config.count}
          onChange={(e) => {
            const n = Math.min(30, Math.max(1, Math.floor(Number(e.target.value) || 1)))
            onChange({ ...config, count: n })
          }}
        />
      </label>
      <label className="field">
        중복 허용
        <input
          type="checkbox"
          checked={config.allowRepeat}
          onChange={(e) => onChange({ ...config, allowRepeat: e.target.checked })}
        />
      </label>
      <label className="field">
        뽑힌 학생 표시
        <input
          type="checkbox"
          checked={config.showPicked}
          onChange={(e) => onChange({ ...config, showPicked: e.target.checked })}
        />
      </label>

      <CommonFields config={config} onChange={onChange} />
    </>
  )
}
