import type { ClockConfig } from '@nwh/core'
import CommonFields from '../../components/CommonFields'
import FontSelect from '../../components/FontSelect'
import type { SettingsFormProps } from '../types'

export default function ClockSettings({
  config,
  onChange,
}: SettingsFormProps<ClockConfig>) {
  const set = <K extends keyof ClockConfig>(key: K, value: ClockConfig[K]) =>
    onChange({ ...config, [key]: value })

  return (
    <>
      <label className="field">
        표시 모드
        <select
          value={config.mode}
          onChange={(e) => set('mode', e.target.value as ClockConfig['mode'])}
        >
          <option value="digital">디지털</option>
          <option value="analog">아날로그</option>
        </select>
      </label>

      <label className="field">
        시간제
        <select
          value={config.hour12 ? '12' : '24'}
          onChange={(e) => set('hour12', e.target.value === '12')}
        >
          <option value="24">24시간</option>
          <option value="12">12시간</option>
        </select>
      </label>

      <label className="field">
        날짜 표시
        <input
          type="checkbox"
          checked={config.showDate}
          onChange={(e) => set('showDate', e.target.checked)}
        />
      </label>

      <label className="field">
        초 표시
        <input
          type="checkbox"
          checked={config.showSeconds}
          onChange={(e) => set('showSeconds', e.target.checked)}
        />
      </label>

      <FontSelect value={config.font} onChange={(font) => set('font', font)} />

      <label className="field">
        크기 (임베드)
        <select
          value={config.size}
          onChange={(e) => set('size', e.target.value as ClockConfig['size'])}
        >
          <option value="s">작게</option>
          <option value="m">보통</option>
          <option value="l">크게</option>
        </select>
      </label>

      <CommonFields config={config} onChange={onChange} />
    </>
  )
}
