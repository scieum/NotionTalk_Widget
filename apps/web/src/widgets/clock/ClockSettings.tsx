import type { ClockConfig } from '@nwh/core'
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

      <label className="field">
        카드 배경
        <select
          value={config.bg}
          onChange={(e) => set('bg', e.target.value as ClockConfig['bg'])}
        >
          <option value="default">기본 (테마 추종)</option>
          <option value="charcoal">차콜</option>
          <option value="pink">핑크</option>
          <option value="mint">민트</option>
          <option value="green">그린</option>
          <option value="blue">블루</option>
          <option value="purple">퍼플</option>
          <option value="sand">샌드</option>
        </select>
      </label>

      <label className="field">
        테마
        <select
          value={config.theme}
          onChange={(e) => set('theme', e.target.value as ClockConfig['theme'])}
        >
          <option value="auto">자동</option>
          <option value="light">라이트</option>
          <option value="dark">다크</option>
        </select>
      </label>

      <label className="field">
        액센트 색
        <select
          value={config.accent}
          onChange={(e) => set('accent', e.target.value as ClockConfig['accent'])}
        >
          <option value="blue">블루</option>
          <option value="teal">틸</option>
          <option value="green">그린</option>
          <option value="orange">오렌지</option>
          <option value="pink">핑크</option>
          <option value="purple">퍼플</option>
        </select>
      </label>

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
    </>
  )
}
