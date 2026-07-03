import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/** 랜덤뽑기 — 명단은 localStorage 프리셋(개인정보, URL 금지 기본) */
export const randomPickerConfigSchema = z.object({
  /** 한 번에 뽑을 인원 */
  count: z.number().int().min(1).max(30).default(1),
  /** 중복 허용 (false = 이미 뽑힌 학생 제외) */
  allowRepeat: z.boolean().default(false),
  /** 이미 뽑힌 학생 목록 표시 */
  showPicked: z.boolean().default(true),
  /** 추첨 연출 — text: 이름 롤링, roulette: 룰렛 휠, claw: 인형뽑기 */
  visual: z.enum(['text', 'roulette', 'claw']).default('text'),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type RandomPickerConfig = z.output<typeof randomPickerConfigSchema>
