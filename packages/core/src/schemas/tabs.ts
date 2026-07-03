import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

/**
 * 탭 컨테이너 — 위젯 여러 개를 탭 하나의 임베드로 묶는다 (공간 절약).
 * 각 탭은 대상 위젯 종류 + 그 위젯의 인코딩된 설정 문자열(c) 스냅샷.
 * 컨테이너 자체 재귀(tabs 안 tabs)는 웹 쪽에서 금지한다.
 */
export const tabsConfigSchema = z.object({
  tabs: z
    .array(
      z.object({
        /** 탭 라벨 */
        label: z.string().min(1).max(12),
        /** 대상 위젯 id (registry 키) */
        widget: z.string().min(1).max(30),
        /** 대상 위젯의 설정 문자열 (?c= 값 스냅샷) */
        c: z.string().max(4000).default(''),
      }),
    )
    .max(6)
    .default([]),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type TabsConfig = z.output<typeof tabsConfigSchema>
