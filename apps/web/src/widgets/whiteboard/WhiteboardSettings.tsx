import type { WhiteboardConfig } from '@nwh/core'
import CommonFields from '../../components/CommonFields'
import type { SettingsFormProps } from '../types'

export default function WhiteboardSettings({
  config,
  onChange,
}: SettingsFormProps<WhiteboardConfig>) {
  const set = <K extends keyof WhiteboardConfig>(key: K, value: WhiteboardConfig[K]) =>
    onChange({ ...config, [key]: value })

  return (
    <>
      <label className="field">
        보드 종류
        <select
          value={config.board}
          onChange={(e) => set('board', e.target.value as WhiteboardConfig['board'])}
        >
          <option value="white">화이트보드 (마커)</option>
          <option value="black">블랙보드 (분필)</option>
          <option value="green">초록 칠판 (분필)</option>
        </select>
      </label>

      <CommonFields config={config} onChange={onChange} />
    </>
  )
}
