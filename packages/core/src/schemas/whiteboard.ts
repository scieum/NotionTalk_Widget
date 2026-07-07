import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/**
 * 화이트보드/블랙보드 위젯 설정.
 * 펜 색상·굵기·도구 선택은 그리기 세션 중의 클라이언트 상태일 뿐이라 URL 설정에
 * 넣지 않는다(그림 자체도 저장하지 않음 — 물리 칠판처럼 세션성 도구로 취급).
 * 전 필드 .default() 필수 — parse({})가 기본 설정이 된다.
 * .strict() 금지(전방 호환) — 알 수 없는 키는 strip.
 */
export const whiteboardConfigSchema = z.object({
  /** 보드 색 — white(마커), black/green(분필) */
  board: z.enum(['white', 'black', 'green']).default('white'),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type WhiteboardConfig = z.output<typeof whiteboardConfigSchema>
