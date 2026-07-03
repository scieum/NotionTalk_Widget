import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/**
 * 사다리타기 — 참가자는 명단(localStorage)에서, 결과 라벨만 URL 설정.
 * 결과 수 < 참가자 수면 남는 자리는 blankLabel로 채운다.
 */
export const ladderConfigSchema = z.object({
  /** 결과 라벨 (예: 청소, 발표) — 비우면 당첨 1개 */
  results: z.array(z.string().min(1).max(20)).max(12).default(['당첨']),
  /** 결과가 모자랄 때 채우는 라벨 */
  blankLabel: z.string().min(1).max(20).default('꽝'),
  /** 참가자 상한 (사다리 가독성) */
  maxSlots: z.number().int().min(2).max(12).default(8),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type LadderConfig = z.output<typeof ladderConfigSchema>
