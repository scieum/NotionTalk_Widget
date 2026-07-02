import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/** 캘린더 위젯 — 순수 표시형 월간 달력 (Notion 연동 없음) */
export const calendarConfigSchema = z.object({
  /** 주 시작 요일 */
  weekStart: z.enum(['mon', 'sun']).default('mon'),
  /** 이전/다음 달 이동 버튼 */
  showNav: z.boolean().default(true),
  /** 표시 폰트 — widgetFonts 카탈로그 id, 'default' = 기본 스택 */
  font: z.string().max(50).default('default'),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type CalendarConfig = z.output<typeof calendarConfigSchema>
