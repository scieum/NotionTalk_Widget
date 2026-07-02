import { z } from 'zod'
import { accentField, bgField, themeField } from './common'

/** 캘린더 위젯 — 순수 표시형 월간 달력 (Notion 연동 없음) */
export const calendarConfigSchema = z.object({
  /** 주 시작 요일 */
  weekStart: z.enum(['mon', 'sun']).default('mon'),
  /** 이전/다음 달 이동 버튼 */
  showNav: z.boolean().default(true),
  theme: themeField,
  accent: accentField,
  bg: bgField,
})

export type CalendarConfig = z.output<typeof calendarConfigSchema>
