import { decodeConfig } from '@nwh/core'
import { Maximize2, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useResolvedTheme } from '../hooks/useResolvedTheme'
import { registry } from '../widgets/registry'
import type { LayoutMode, WidgetDef } from '../widgets/types'

export default function WidgetPage({ layout }: { layout: LayoutMode }) {
  const { widget = '' } = useParams()
  const [params] = useSearchParams()
  const def = registry[widget]

  if (!def) {
    return (
      <div className={`widget-frame widget-frame--${layout}`}>
        <span style={{ color: 'var(--fg-muted)', fontSize: 14 }}>
          알 수 없는 위젯입니다: {widget || '(없음)'}
        </span>
      </div>
    )
  }

  return <WidgetView def={def} layout={layout} raw={params.get('c')} />
}

function WidgetView({
  def,
  layout,
  raw,
}: {
  def: WidgetDef
  layout: LayoutMode
  raw: string | null
}) {
  const result = useMemo(() => decodeConfig(def.schema, raw), [def, raw])
  // 위젯 공통 규약: theme 필드는 auto|light|dark, bg 필드는 파스텔 카드 배경
  const common = result.value as {
    theme?: 'auto' | 'light' | 'dark'
    bg?: string
  }
  const theme = useResolvedTheme(common.theme ?? 'auto')
  const bg = common.bg ?? 'default'

  // c가 아예 없는 것(empty)은 정상 경로 — 배지는 깨진 설정에만
  const showFallbackBadge = !result.ok && result.reason !== 'empty'

  const frameClass = [
    'widget-frame',
    `widget-frame--${layout}`,
    theme === 'dark' ? 'dark' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // 비율 선언 위젯은 카드가 콘텐츠에 핏하게 줄어든다 (파스텔 여백 잘림)
  const aspect =
    layout === 'embed' ? def.embedAspect?.(result.value) : undefined
  const cardStyle = aspect
    ? {
        width: `min(100vw - 16px, calc((100vh - 16px) * ${aspect}))`,
        height: 'auto' as const,
        aspectRatio: `${aspect}`,
      }
    : undefined

  return (
    <div className={frameClass}>
      {showFallbackBadge && (
        <span className="fallback-badge">
          <TriangleAlert size={12} aria-hidden />
          기본 설정으로 표시 중
        </span>
      )}
      <div
        className={`widget-card widget-card--${layout} widget-card--bg-${bg}`}
        style={cardStyle}
      >
        <def.Component config={result.value} layout={layout} />
      </div>
      {layout === 'embed' && (
        <a
          className="fullscreen-link"
          href={`/f/${def.id}${raw ? `?c=${raw}` : ''}`}
          target="_blank"
          rel="noreferrer"
        >
          <Maximize2 size={12} aria-hidden />
          전체화면
        </a>
      )}
    </div>
  )
}
