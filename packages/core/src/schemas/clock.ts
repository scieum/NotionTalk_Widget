import { z } from 'zod'
import { accentField, bgField, themeField } from './common'

/**
 * 시계 위젯 설정.
 * 전 필드 .default() 필수 — parse({})가 기본 설정이 된다.
 * .strict() 금지(전방 호환) — 알 수 없는 키는 strip.
 */
export const clockConfigSchema = z.object({
  /** 표시 모드 */
  mode: z.enum(['digital', 'analog']).default('digital'),
  /** 12시간제 여부 (false = 24시간제) */
  hour12: z.boolean().default(false),
  /** 날짜 표시 */
  showDate: z.boolean().default(true),
  /** 초 표시 (디지털: 초 자리, 아날로그: 초침) */
  showSeconds: z.boolean().default(true),
  /** 임베드 크기 변형 (전체화면에서는 무시 — 항상 최대) */
  size: z.enum(['s', 'm', 'l']).default('m'),
  theme: themeField,
  accent: accentField,
  bg: bgField,
})

export type ClockConfig = z.output<typeof clockConfigSchema>
