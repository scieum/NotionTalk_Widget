import { z } from 'zod'

/**
 * 전 위젯 공통 표시 필드 — WidgetPage가 이 규약(theme/bg)으로
 * 테마와 파스텔 카드 배경을 처리한다.
 */

export const themeField = z.enum(['auto', 'light', 'dark']).default('auto')

export const accentField = z
  .enum(['blue', 'teal', 'green', 'orange', 'pink', 'purple'])
  .default('blue')

export const bgField = z
  .enum(['default', 'charcoal', 'pink', 'mint', 'green', 'blue', 'purple', 'sand'])
  .default('default')

/**
 * 임베드 카드 비율 — auto는 위젯별 기본(embedAspect), 나머지는 사용자 지정.
 * fill = iframe 꽉 채움, square = 1:1, wide = 2:1.
 */
export const fitField = z.enum(['auto', 'fill', 'square', 'wide']).default('auto')

export type CardFit = z.output<typeof fitField>

export type Accent = z.output<typeof accentField>
export type PastelBg = z.output<typeof bgField>

/** 액센트 → CSS 변수 (web에서 사용) */
export const ACCENT_CSS_VAR: Record<Accent, string> = {
  blue: 'var(--accent-blue)',
  teal: 'var(--accent-teal)',
  green: 'var(--accent-green)',
  orange: 'var(--accent-orange)',
  pink: 'var(--accent-pink)',
  purple: 'var(--accent-purple)',
}
