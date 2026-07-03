import type { LadderConfig } from '@nwh/core'
import CommonFields from '../../components/CommonFields'
import type { SettingsFormProps } from '../types'

export default function LadderSettings({
  config,
  onChange,
}: SettingsFormProps<LadderConfig>) {
  const parseResults = (text: string): string[] => {
    const items = text
      .split(',')
      .map((s) => s.trim().slice(0, 20))
      .filter(Boolean)
      .slice(0, 12)
    return items.length > 0 ? items : ['당첨']
  }

  return (
    <>
      <label className="field" style={{ display: 'block' }}>
        결과 라벨 (콤마 구분 · 모자라면 아래 라벨로 채움)
        <input
          type="text"
          defaultValue={config.results.join(', ')}
          onBlur={(e) => onChange({ ...config, results: parseResults(e.target.value) })}
          placeholder="당첨, 청소, 발표"
          style={{ width: '100%', marginTop: 4 }}
        />
      </label>

      <label className="field">
        빈자리 라벨
        <input
          type="text"
          defaultValue={config.blankLabel}
          onBlur={(e) =>
            onChange({ ...config, blankLabel: e.target.value.trim().slice(0, 20) || '꽝' })
          }
        />
      </label>

      <label className="field">
        참가자 상한
        <select
          value={String(config.maxSlots)}
          onChange={(e) => onChange({ ...config, maxSlots: Number(e.target.value) })}
        >
          {[4, 6, 8, 10, 12].map((n) => (
            <option key={n} value={n}>
              {n}명
            </option>
          ))}
        </select>
      </label>
      <p className="tool__hint" style={{ textAlign: 'left' }}>
        참가자는 위젯 안의 명단에서 오고, 상한을 넘으면 앞에서부터 잘립니다.
      </p>

      <CommonFields config={config} onChange={onChange} />
    </>
  )
}
