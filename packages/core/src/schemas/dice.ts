import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/** 주사위 — 명단 불필요, 완전 클라이언트 완결 */
export const diceConfigSchema = z.object({
  /** 주사위 개수 */
  count: z.number().int().min(1).max(3).default(1),
  /** 면 수 */
  sides: z.union([
    z.literal(4),
    z.literal(6),
    z.literal(8),
    z.literal(10),
    z.literal(12),
    z.literal(20),
  ]).default(6),
  /** 2개 이상일 때 합계 표시 */
  showTotal: z.boolean().default(true),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type DiceConfig = z.output<typeof diceConfigSchema>
