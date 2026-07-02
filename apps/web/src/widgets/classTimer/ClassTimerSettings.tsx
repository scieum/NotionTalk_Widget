import type { ClassTimerConfig } from '@nwh/core'
import CommonFields from '../../components/CommonFields'
import type { SettingsFormProps } from '../types'

export default function ClassTimerSettings({
  config,
  onChange,
}: SettingsFormProps<ClassTimerConfig>) {
  const onPresets = (text: string) => {
    const presets = [
      ...new Set(
        text
          .split(',')
          .map((s) => Math.floor(Number(s.trim())))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= 180),
      ),
    ].slice(0, 6)
    if (presets.length > 0) onChange({ ...config, presets })
  }

  return (
    <>
      <label className="field">
        프리셋 (분, 콤마 구분)
        <input
          type="text"
          defaultValue={config.presets.join(', ')}
          onBlur={(e) => onPresets(e.target.value)}
        />
      </label>
      <label className="field">
        종료 시 화면 플래시
        <input
          type="checkbox"
          checked={config.flash}
          onChange={(e) => onChange({ ...config, flash: e.target.checked })}
        />
      </label>
      <label className="field">
        알림음
        <input
          type="checkbox"
          checked={config.sound}
          onChange={(e) => onChange({ ...config, sound: e.target.checked })}
        />
      </label>

      <CommonFields config={config} onChange={onChange} />
    </>
  )
}
