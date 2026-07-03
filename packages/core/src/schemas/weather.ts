import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/**
 * 날씨 위젯 설정.
 * 데이터는 Open-Meteo(키 불필요·CORS 허용)를 클라이언트가 직접 호출 — 서버 비의존.
 * 전 필드 .default() 필수 — parse({})가 기본 설정이 된다.
 * .strict() 금지(전방 호환) — 알 수 없는 키는 strip.
 */
export const weatherConfigSchema = z.object({
  /** 위치 표시명 (설정 폼의 도시 검색으로 채움) */
  locationName: z.string().max(60).default('서울'),
  /** 위도/경도 — 도시 검색 결과로 설정 */
  lat: z.number().min(-90).max(90).default(37.5665),
  lon: z.number().min(-180).max(180).default(126.978),
  /** 온도 단위 */
  unit: z.enum(['c', 'f']).default('c'),
  /** 일별 예보 표시 일수 (0 = 현재 날씨만) */
  forecastDays: z.number().int().min(0).max(7).default(5),
  /** 습도·바람·체감 온도 표시 */
  showDetails: z.boolean().default(true),
  /** 표시 폰트 — widgetFonts 카탈로그 id, 'default' = 기본 스택 */
  font: z.string().max(50).default('default'),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type WeatherConfig = z.output<typeof weatherConfigSchema>
