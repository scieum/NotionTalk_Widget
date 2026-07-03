import type { DiceConfig } from '@nwh/core'
import CommonFields from '../../components/CommonFields'
import type { SettingsFormProps } from '../types'

export default function DiceSettings({
  config,
  onChange,
}: SettingsFormProps<DiceConfig>) {
  const set = <K extends keyof DiceConfig>(key: K, value: DiceConfig[K]) =>
    onChange({ ...config, [key]: value })

  return (
    <>
      <label className="field">
        주사위 개수
        <select
          value={String(config.count)}
          onChange={(e) => set('count', Number(e.target.value))}
        >
          <option value="1">1개</option>
          <option value="2">2개</option>
          <option value="3">3개</option>
        </select>
      </label>

      <label className="field">
        면 수
        <select
          value={String(config.sides)}
          onChange={(e) => set('sides', Number(e.target.value) as DiceConfig['sides'])}
        >
          <option value="4">4면 (d4)</option>
          <option value="6">6면 (d6)</option>
          <option value="8">8면 (d8)</option>
          <option value="10">10면 (d10)</option>
          <option value="12">12면 (d12)</option>
          <option value="20">20면 (d20)</option>
        </select>
      </label>

      <label className="field">
        합계 표시 (2개 이상)
        <input
          type="checkbox"
          checked={config.showTotal}
          onChange={(e) => set('showTotal', e.target.checked)}
        />
      </label>

      <CommonFields config={config} onChange={onChange} />
    </>
  )
}
