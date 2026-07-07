import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/**
 * 플립 시계 위젯 설정.
 * 전 필드 .default() 필수 — parse({})가 기본 설정이 된다.
 * .strict() 금지(전방 호환) — 알 수 없는 키는 strip.
 */
export const flipClockConfigSchema = z.object({
  /** 12시간제 여부 (false = 24시간제) */
  hour12: z.boolean().default(false),
  /** 날짜 표시 */
  showDate: z.boolean().default(true),
  /** 초 카드 표시 */
  showSeconds: z.boolean().default(true),
  /** 임베드 크기 변형 (전체화면에서는 무시 — 항상 최대) */
  size: z.enum(['s', 'm', 'l']).default('m'),
  /** 표시 폰트 — widgetFonts 카탈로그 id, 'default' = 기본 스택 */
  font: z.string().max(50).default('default'),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type FlipClockConfig = z.output<typeof flipClockConfigSchema>
