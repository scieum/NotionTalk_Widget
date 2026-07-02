import { z } from 'zod'
import { accentField, bgField, themeField } from './common'

/**
 * 자리뽑기 — 격자·비활성 칸은 일반 설정(URL 가능).
 * 학생 명단·고정석·분리 조건은 개인정보라 URL/서버 금지 — localStorage 프리셋(web).
 */
export const seatPickerConfigSchema = z.object({
  rows: z.number().int().min(1).max(12).default(5),
  cols: z.number().int().min(1).max(12).default(6),
  /** 사용 안 하는 칸 — "행,열" (0부터) */
  disabled: z.array(z.string().regex(/^\d+,\d+$/)).default([]),
  /** 순차 공개 간격 (ms, 0 = 즉시) */
  revealMs: z.number().int().min(0).max(2000).default(250),
  theme: themeField,
  accent: accentField,
  bg: bgField,
})

export type SeatPickerConfig = z.output<typeof seatPickerConfigSchema>
