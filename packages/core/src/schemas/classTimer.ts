import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/** 수업 타이머 — 카운트다운 (프리셋 + 직접 입력) */
export const classTimerConfigSchema = z.object({
  /** 프리셋 (분) */
  presets: z
    .array(z.number().int().min(1).max(180))
    .min(1)
    .max(6)
    .default([5, 10, 15]),
  /** 종료 시 화면 플래시 */
  flash: z.boolean().default(true),
  /** 종료 알림음 */
  sound: z.boolean().default(true),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type ClassTimerConfig = z.output<typeof classTimerConfigSchema>
