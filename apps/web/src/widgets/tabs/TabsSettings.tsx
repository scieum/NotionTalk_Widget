import { encodeConfig, type TabsConfig } from '@nwh/core'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import CommonFields from '../../components/CommonFields'
import { listInstances } from '../../lib/instances'
import { registry } from '../registry'
import type { SettingsFormProps } from '../types'

type Tab = TabsConfig['tabs'][number]

const MAX_TABS = 6

/** 임베드/전체화면 링크 → {widget, c} (탭 컨테이너 링크는 거부) */
function parseWidgetLink(text: string): Tab | null {
  try {
    const url = new URL(text.trim())
    const match = url.pathname.match(/^\/(?:w|f)\/([a-z0-9-]+)$/)
    const widget = match?.[1]
    if (!widget || widget === 'tabs' || !registry[widget]) return null
    return {
      label: registry[widget]!.name.slice(0, 12),
      widget,
      c: url.searchParams.get('c') ?? '',
    }
  } catch {
    return null
  }
}

export default function TabsSettings({
  config,
  onChange,
}: SettingsFormProps<TabsConfig>) {
  const [linkText, setLinkText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [selectedInstance, setSelectedInstance] = useState('')

  // 탭 컨테이너 자신은 제외 (재귀 금지)
  const instances = useMemo(
    () => listInstances().filter((i) => i.type !== 'tabs' && registry[i.type]),
    [],
  )

  const setTabs = (tabs: Tab[]) => onChange({ ...config, tabs })

  const addTab = (tab: Tab) => {
    if (config.tabs.length >= MAX_TABS) {
      setMessage(`탭은 최대 ${MAX_TABS}개까지예요.`)
      return
    }
    setMessage(null)
    setTabs([...config.tabs, tab])
  }

  const addFromInstance = () => {
    const instance = instances.find((i) => i.id === selectedInstance)
    if (!instance) return
    const def = registry[instance.type]!
    const parsed = def.schema.safeParse(instance.config)
    const c = encodeConfig(def.schema, (parsed.success ? parsed.data : {}) as never)
    addTab({ label: instance.name.trim().slice(0, 12) || def.name, widget: instance.type, c })
  }

  const addFromLink = () => {
    const tab = parseWidgetLink(linkText)
    if (!tab) {
      setMessage('위젯 임베드 링크가 아니에요. (탭 위젯 링크는 넣을 수 없어요)')
      return
    }
    setLinkText('')
    addTab(tab)
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= config.tabs.length) return
    const tabs = [...config.tabs]
    ;[tabs[i], tabs[j]] = [tabs[j]!, tabs[i]!]
    setTabs(tabs)
  }

  const rename = (i: number, label: string) => {
    const tabs = [...config.tabs]
    tabs[i] = { ...tabs[i]!, label: label.slice(0, 12) }
    setTabs(tabs)
  }

  return (
    <>
      {config.tabs.length > 0 && (
        <div className="tabs-editor">
          {config.tabs.map((tab, i) => (
            <div className="tabs-editor__row" key={`${tab.widget}-${i}`}>
              <input
                type="text"
                value={tab.label}
                onChange={(e) => rename(i, e.target.value)}
                aria-label={`탭 ${i + 1} 라벨`}
              />
              <span className="tabs-editor__type">
                {registry[tab.widget]?.name ?? tab.widget}
              </span>
              <button type="button" className="btn btn--sm btn--ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="위로">
                <ArrowUp size={13} aria-hidden />
              </button>
              <button type="button" className="btn btn--sm btn--ghost" disabled={i === config.tabs.length - 1} onClick={() => move(i, 1)} aria-label="아래로">
                <ArrowDown size={13} aria-hidden />
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setTabs(config.tabs.filter((_, j) => j !== i))}
                aria-label="삭제"
              >
                <Trash2 size={13} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="field">
        My Widgets에서 추가
        <select
          value={selectedInstance}
          onChange={(e) => setSelectedInstance(e.target.value)}
        >
          <option value="">위젯 선택…</option>
          {instances.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({registry[i.type]?.name})
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn btn--sm"
        disabled={!selectedInstance || config.tabs.length >= MAX_TABS}
        onClick={addFromInstance}
      >
        <Plus size={13} aria-hidden /> 탭으로 추가
      </button>

      <label className="field" style={{ display: 'block' }}>
        또는 임베드 링크 붙여넣기
        <input
          type="text"
          placeholder="https://…/w/위젯?c=…"
          value={linkText}
          onChange={(e) => setLinkText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addFromLink()
            }
          }}
          style={{ width: '100%', marginTop: 4 }}
        />
      </label>
      <button
        type="button"
        className="btn btn--sm btn--ghost"
        disabled={!linkText.trim() || config.tabs.length >= MAX_TABS}
        onClick={addFromLink}
      >
        <Plus size={13} aria-hidden /> 링크로 추가
      </button>

      {message && (
        <p className="tool__hint" style={{ textAlign: 'left' }}>
          {message}
        </p>
      )}
      <p className="tool__hint" style={{ textAlign: 'left' }}>
        탭에는 추가 시점의 위젯 설정이 담겨요. 원본 위젯을 바꿨다면 탭을
        지우고 다시 추가하세요.
      </p>

      <CommonFields config={config} onChange={onChange} />
    </>
  )
}
