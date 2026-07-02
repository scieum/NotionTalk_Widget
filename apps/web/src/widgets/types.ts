import type { PastelBg } from '@nwh/core'
import type { z } from 'zod'
import type { ComponentType } from 'react'

export type LayoutMode = 'embed' | 'fullscreen'

export type WidgetCategory = 'personal' | 'classroom' | 'notion'

export const CATEGORY_LABEL: Record<WidgetCategory, string> = {
  personal: '개인 위젯',
  classroom: '수업 도구',
  notion: 'Notion 연동',
}

export interface WidgetProps<C> {
  config: C
  layout: LayoutMode
}

export interface SettingsFormProps<C> {
  config: C
  onChange: (config: C) => void
}

export interface WidgetDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  id: string
  name: string
  description: string
  category: WidgetCategory
  /** 위젯 종류의 시그니처 파스텔 — Explore 미리보기·새 위젯의 기본 배경 */
  signatureBg: PastelBg
  /**
   * 임베드 카드의 가로/세로 비율. 지정하면 카드가 이 비율로 콘텐츠에
   * 핏하게 줄어들고(여백 잘림), 없으면 iframe을 꽉 채운다.
   */
  embedAspect?: (config: z.output<S>) => number | undefined
  /** Explore/My Widgets 카드용 정적 썸네일 — 글자·컨트롤 없이 핵심만 */
  Thumb: ComponentType
  schema: S
  Component: ComponentType<WidgetProps<z.output<S>>>
  SettingsForm: ComponentType<SettingsFormProps<z.output<S>>>
}
