import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/**
 * 갤러리 위젯 설정. Notion "파일과 미디어" 속성(여러 파일 가능)을 읽어
 * 각 파일을 개별 카드로 보여준다. 이미지는 썸네일, PDF는 임베드 미리보기.
 * 전 필드 .default() 필수 — parse({})가 기본 설정이 된다.
 * .strict() 금지(전방 호환) — 알 수 없는 키는 strip.
 */
export const galleryConfigSchema = z.object({
  /** 갤러리 DB ID (비우면 미연결 상태) */
  dbId: z.string().max(40).regex(/^[0-9a-fA-F-]*$/).default(''),
  /** 임베드용 위젯 토큰 (OAuth 사용자, sealed) */
  wt: z.string().max(1000).regex(/^[\w.-]*$/).default(''),
  /** 각 파일 카드 아래에 페이지 제목 표시 */
  showCaption: z.boolean().default(true),
  /** 그리드 열 수 (auto = 카드 너비 기준 자동) */
  columns: z.enum(['auto', '2', '3', '4']).default('auto'),
  /** 기본 정렬 — 위젯 안에서 실시간으로 바꿀 수 있는 시작값 */
  sort: z.enum(['default', 'title', 'date-desc', 'date-asc']).default('default'),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type GalleryConfig = z.output<typeof galleryConfigSchema>
