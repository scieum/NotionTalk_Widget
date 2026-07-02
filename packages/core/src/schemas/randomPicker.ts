import { z } from 'zod'
import { accentField, bgField, themeField } from './common'

/** 랜덤뽑기 — 명단은 localStorage 프리셋(개인정보, URL 금지 기본) */
export const randomPickerConfigSchema = z.object({
  /** 한 번에 뽑을 인원 */
  count: z.number().int().min(1).max(30).default(1),
  /** 중복 허용 (false = 이미 뽑힌 학생 제외) */
  allowRepeat: z.boolean().default(false),
  /** 이미 뽑힌 학생 목록 표시 */
  showPicked: z.boolean().default(true),
  theme: themeField,
  accent: accentField,
  bg: bgField,
})

export type RandomPickerConfig = z.output<typeof randomPickerConfigSchema>
