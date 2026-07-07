import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/**
 * 할일 위젯 — Notion 할일 DB(제목 + 마감일 + 완료 여부)를 읽어 목록으로 표시한다.
 * 읽기 전용(완료 상태를 Notion에 역기록하지 않음). DB 미연결이면 연결 안내를 띄운다.
 */
export const todoConfigSchema = z.object({
  /** 할일 DB ID (비우면 연결 안내) */
  dbId: z.string().max(40).regex(/^[0-9a-fA-F-]*$/).default(''),
  /** 임베드용 위젯 토큰 (OAuth 사용자, sealed) */
  wt: z.string().max(1000).regex(/^[\w.-]*$/).default(''),
  /** 완료 항목 처리 — 흐리게 표시 / 숨김 */
  completed: z.enum(['show', 'hide']).default('show'),
  /** 마감일 기준 묶어 보기 (지남·오늘·예정·무기한) */
  groupByDate: z.boolean().default(true),
  /** 제목 표시 (연결한 DB 이름) */
  showTitle: z.boolean().default(true),
  /** 표시 폰트 — widgetFonts 카탈로그 id, 'default' = 기본 스택 */
  font: z.string().max(50).default('default'),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type TodoConfig = z.output<typeof todoConfigSchema>
