import type { PomodoroConfig } from '@nwh/core'
import CommonFields from '../../components/CommonFields'
import type { SettingsFormProps } from '../types'

export default function PomodoroSettings({
  config,
  onChange,
}: SettingsFormProps<PomodoroConfig>) {
  const setNum =
    (key: 'focusMin' | 'shortBreakMin' | 'longBreakMin' | 'cyclesPerLongBreak', max: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Math.min(max, Math.max(1, Math.floor(Number(e.target.value) || 1)))
      onChange({ ...config, [key]: n })
    }

  return (
    <>
      <label className="field">
        집중 (분)
        <input type="number" min={1} max={180} value={config.focusMin} onChange={setNum('focusMin', 180)} />
      </label>
      <label className="field">
        짧은 휴식 (분)
        <input type="number" min={1} max={60} value={config.shortBreakMin} onChange={setNum('shortBreakMin', 60)} />
      </label>
      <label className="field">
        긴 휴식 (분)
        <input type="number" min={1} max={120} value={config.longBreakMin} onChange={setNum('longBreakMin', 120)} />
      </label>
      <label className="field">
        긴 휴식 주기 (회)
        <input type="number" min={1} max={12} value={config.cyclesPerLongBreak} onChange={setNum('cyclesPerLongBreak', 12)} />
      </label>
      <label className="field">
        자동 연속 진행
        <input
          type="checkbox"
          checked={config.autoContinue}
          onChange={(e) => onChange({ ...config, autoContinue: e.target.checked })}
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

      <label className="field">
        Notion 자동기록
        <input
          type="checkbox"
          checked={config.notionSync}
          onChange={(e) => onChange({ ...config, notionSync: e.target.checked })}
        />
      </label>

      {config.notionSync && (
        <>
          <label className="field">
            기록 DB ID
            <input
              type="text"
              placeholder="비우면 서버 기본 DB"
              defaultValue={config.dbId}
              onBlur={(e) => {
                const dbId = e.target.value.replace(/[^0-9a-fA-F-]/g, '').slice(0, 40)
                onChange({ ...config, dbId })
              }}
            />
          </label>
          <label className="field">
            기록 분류
            <input
              type="text"
              defaultValue={config.category}
              onBlur={(e) =>
                onChange({ ...config, category: e.target.value.trim() || '뽀모도로' })
              }
            />
          </label>
          <p className="tool__hint" style={{ textAlign: 'left' }}>
            집중 완료마다 기록 DB에 행이 추가됩니다 (날짜·분류·시간(분)·메모).
            서버 통합에 DB가 공유돼 있어야 해요.
          </p>
        </>
      )}

      <CommonFields config={config} onChange={onChange} />
    </>
  )
}
