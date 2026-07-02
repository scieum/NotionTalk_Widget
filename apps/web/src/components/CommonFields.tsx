/**
 * 전 위젯 공통 설정 필드(테마·액센트·카드 배경) — 설정 폼에서 재사용.
 */

interface CommonConfig {
  theme: 'auto' | 'light' | 'dark'
  accent: 'blue' | 'teal' | 'green' | 'orange' | 'pink' | 'purple'
  bg: 'default' | 'charcoal' | 'pink' | 'mint' | 'green' | 'blue' | 'purple' | 'sand'
  fit: 'auto' | 'fill' | 'square' | 'wide'
}

export default function CommonFields<C extends CommonConfig>({
  config,
  onChange,
}: {
  config: C
  onChange: (config: C) => void
}) {
  return (
    <>
      <label className="field">
        카드 비율
        <select
          value={config.fit}
          onChange={(e) => onChange({ ...config, fit: e.target.value as C['fit'] })}
        >
          <option value="auto">자동 (위젯 기본)</option>
          <option value="fill">꽉 채움</option>
          <option value="square">정사각 (1:1)</option>
          <option value="wide">와이드 (2:1)</option>
        </select>
      </label>

      <label className="field">
        카드 배경
        <select
          value={config.bg}
          onChange={(e) => onChange({ ...config, bg: e.target.value as C['bg'] })}
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
          onChange={(e) =>
            onChange({ ...config, theme: e.target.value as C['theme'] })
          }
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
          onChange={(e) =>
            onChange({ ...config, accent: e.target.value as C['accent'] })
          }
        >
          <option value="blue">블루</option>
          <option value="teal">틸</option>
          <option value="green">그린</option>
          <option value="orange">오렌지</option>
          <option value="pink">핑크</option>
          <option value="purple">퍼플</option>
        </select>
      </label>
    </>
  )
}
