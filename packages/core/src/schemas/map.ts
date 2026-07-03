import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/**
 * 지도 위젯 — Notion의 지도 DB 뷰가 한국 지도를 지원하지 않는 문제의 대안.
 * Notion DB의 제목 + 주소(텍스트) 속성을 읽어 여러 핀을 지도(OSM)에 표시한다.
 * DB 미연결이면 설정한 중심 좌표에 핀 하나(단일 위치 모드).
 */
export const mapConfigSchema = z.object({
  /** 장소 DB ID (비우면 단일 위치 모드) */
  dbId: z.string().max(40).regex(/^[0-9a-fA-F-]*$/).default(''),
  /** 임베드용 위젯 토큰 (OAuth 사용자, sealed) */
  wt: z.string().max(1000).regex(/^[\w.-]*$/).default(''),
  /** 단일 위치 모드의 표시명 */
  locationName: z.string().max(80).default('서울특별시'),
  lat: z.number().min(-90).max(90).default(37.5665),
  lon: z.number().min(-180).max(180).default(126.978),
  /** 확대 수준 (5 광역 ~ 18 골목) — DB 모드에서는 핀 전체에 자동 맞춤 */
  zoom: z.number().int().min(5).max(18).default(15),
  /** 핀 클릭 없이도 장소 이름 라벨 상시 표시 */
  showLabel: z.boolean().default(false),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type MapConfig = z.output<typeof mapConfigSchema>
