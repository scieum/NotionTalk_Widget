import type { SeatPickerConfig } from '@nwh/core'
import CommonFields from '../../components/CommonFields'
import type { SettingsFormProps } from '../types'

export default function SeatPickerSettings({
  config,
  onChange,
}: SettingsFormProps<SeatPickerConfig>) {
  const setDim = (key: 'rows' | 'cols') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Math.min(12, Math.max(1, Math.floor(Number(e.target.value) || 1)))
    // 격자 축소 시 범위 밖 비활성 칸 정리
    const rows = key === 'rows' ? n : config.rows
    const cols = key === 'cols' ? n : config.cols
    const disabled = config.disabled.filter((cell) => {
      const [r, c] = cell.split(',').map(Number)
      return (r ?? 99) < rows && (c ?? 99) < cols
    })
    onChange({ ...config, [key]: n, disabled })
  }

  const toggleCell = (r: number, c: number) => {
    const key = `${r},${c}`
    const disabled = config.disabled.includes(key)
      ? config.disabled.filter((cell) => cell !== key)
      : [...config.disabled, key]
    onChange({ ...config, disabled })
  }

  return (
    <>
      <label className="field">
        행 (세로)
        <input type="number" min={1} max={12} value={config.rows} onChange={setDim('rows')} />
      </label>
      <label className="field">
        열 (가로)
        <input type="number" min={1} max={12} value={config.cols} onChange={setDim('cols')} />
      </label>

      <div className="field" style={{ display: 'block' }}>
        사용 안 하는 칸 (클릭해서 끄기/켜기)
        <div
          className="mini-grid"
          style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}
        >
          {Array.from({ length: config.rows * config.cols }, (_, i) => {
            const r = Math.floor(i / config.cols)
            const c = i % config.cols
            const off = config.disabled.includes(`${r},${c}`)
            return (
              <button
                key={`${r},${c}`}
                type="button"
                className={`mini-cell${off ? ' mini-cell--off' : ''}`}
                aria-label={`${r + 1}행 ${c + 1}열 ${off ? '비활성' : '활성'}`}
                onClick={() => toggleCell(r, c)}
              />
            )
          })}
        </div>
      </div>

      <label className="field">
        공개 간격
        <select
          value={config.revealMs}
          onChange={(e) => onChange({ ...config, revealMs: Number(e.target.value) })}
        >
          <option value={0}>즉시</option>
          <option value={150}>빠르게</option>
          <option value={250}>보통</option>
          <option value={500}>천천히</option>
          <option value={1000}>아주 천천히</option>
        </select>
      </label>

      <CommonFields config={config} onChange={onChange} />
    </>
  )
}
