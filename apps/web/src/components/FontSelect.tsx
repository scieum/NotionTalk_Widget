import { WIDGET_FONTS } from '../lib/widgetFonts'

/** 위젯 설정 폼 공용 폰트 셀렉트 */
export default function FontSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (fontId: string) => void
}) {
  return (
    <label className="field">
      폰트
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="default">기본</option>
        {WIDGET_FONTS.map((font) => (
          <option key={font.id} value={font.id}>
            {font.label}
          </option>
        ))}
      </select>
    </label>
  )
}
