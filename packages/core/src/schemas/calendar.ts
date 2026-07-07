import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/**
 * 캘린더 위젯 — 월간 달력. 기본은 순수 표시형이며, 할일 DB를 연결하면
 * 마감일이 있는 날에 점을 찍고 선택한 날의 할일 목록을 아래에 보여준다(읽기 전용).
 */
export const calendarConfigSchema = z.object({
  /** 주 시작 요일 */
  weekStart: z.enum(['mon', 'sun']).default('mon'),
  /** 이전/다음 달 이동 버튼 */
  showNav: z.boolean().default(true),
  /** 할일 DB ID (비우면 순수 표시형 달력) */
  dbId: z.string().max(40).regex(/^[0-9a-fA-F-]*$/).default(''),
  /** 임베드용 위젯 토큰 (OAuth 사용자, sealed) */
  wt: z.string().max(1000).regex(/^[\w.-]*$/).default(''),
  /** 완료된 할일도 표시 (점·목록에 포함) */
  showDone: z.boolean().default(true),
  /** 표시 폰트 — widgetFonts 카탈로그 id, 'default' = 기본 스택 */
  font: z.string().max(50).default('default'),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type CalendarConfig = z.output<typeof calendarConfigSchema>
