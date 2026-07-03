import { decodeConfig, type TabsConfig } from '@nwh/core'
import { useMemo, useState } from 'react'
import { registry } from '../registry'
import type { WidgetProps } from '../types'

/**
 * 탭 컨테이너 — 위젯 여러 개를 한 임베드에서 탭으로 전환.
 * 모든 탭을 마운트한 채 display로만 숨겨, 탭을 오가도 뽀모도로 타이머
 * 같은 상태가 유지된다. (탭 안 탭은 설정에서 차단)
 */
export default function TabsWidget({
  config,
  layout,
}: WidgetProps<TabsConfig>) {
  const [active, setActive] = useState(0)

  const tabs = useMemo(
    () =>
      config.tabs.map((tab) => {
        const def = tab.widget === 'tabs' ? undefined : registry[tab.widget]
        if (!def) return { tab, def: undefined, config: undefined }
        const decoded = decodeConfig(def.schema, tab.c)
        return { tab, def, config: decoded.value }
      }),
    [config.tabs],
  )

  if (tabs.length === 0) {
    return (
      <div className="tool">
        <span className="tool__hint">
          설정에서 탭을 추가하세요 — 만든 위젯이나 임베드 링크를 탭으로 묶을 수
          있어요.
        </span>
      </div>
    )
  }

  const current = Math.min(active, tabs.length - 1)

  return (
    <div className="tabs-widget">
      <div className="tabs-widget__bar" role="tablist">
        {tabs.map(({ tab }, i) => (
          <button
            key={`${tab.label}-${i}`}
            type="button"
            role="tab"
            aria-selected={current === i}
            className={`tabs-widget__tab${current === i ? ' tabs-widget__tab--active' : ''}`}
            onClick={() => setActive(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map(({ tab, def, config: subConfig }, i) => (
        <div
          key={`panel-${i}`}
          className="tabs-widget__panel"
          role="tabpanel"
          style={{ display: current === i ? 'flex' : 'none' }}
        >
          {def && subConfig ? (
            <def.Component
              config={subConfig as never}
              layout={layout}
            />
          ) : (
            <div className="tool">
              <span className="tool__hint">
                알 수 없는 위젯({tab.widget})이에요. 탭을 다시 추가해 주세요.
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
