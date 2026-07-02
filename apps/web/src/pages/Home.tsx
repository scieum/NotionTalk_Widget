import { encodeConfig } from '@nwh/core'
import { Check, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createInstance,
  deleteInstance,
  listInstances,
  type WidgetInstance,
} from '../lib/instances'
import { registry } from '../widgets/registry'
import { CATEGORY_LABEL } from '../widgets/types'

/**
 * 홈 — 주식 위젯 사이트와 동일한 구조:
 * My Widgets(만든 위젯 목록) + Explore(종류 갤러리, 카테고리 필터)
 */
export default function Home() {
  const navigate = useNavigate()
  const [instances, setInstances] = useState<WidgetInstance[]>(listInstances)

  const defs = Object.values(registry)
  const categories = [...new Set(defs.map((d) => d.category))]

  const create = (type: string) => {
    const instance = createInstance(type)
    navigate(`/edit/${instance.id}`)
  }

  const remove = (instance: WidgetInstance) => {
    if (!window.confirm(`'${instance.name}' 위젯을 삭제할까요?`)) return
    deleteInstance(instance.id)
    setInstances(listInstances())
  }

  return (
    <main className="home">
      <h1 className="home__title">Notion Widget Hub</h1>
      <p className="home__subtitle">
        위젯을 만들고 링크를 복사해 Notion에 <code>/embed</code>로 붙여넣으세요.
      </p>

      <h2 className="section-title">My Widgets</h2>
      {instances.length === 0 ? (
        <p className="empty-hint">
          아직 만든 위젯이 없습니다. 아래 Explore에서 종류를 골라 만들어 보세요.
        </p>
      ) : (
        <div className="card-grid">
          {instances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onEdit={() => navigate(`/edit/${instance.id}`)}
              onDelete={() => remove(instance)}
            />
          ))}
        </div>
      )}

      <h2 className="section-title">Explore</h2>
      {categories.map((category) => (
        <section key={category} className="explore-group">
          <h3 className="explore-group__title">{CATEGORY_LABEL[category]}</h3>
          <div className="card-grid">
            {defs
              .filter((def) => def.category === category)
              .map((def) => (
                <TypeCard key={def.id} def={def} onCreate={() => create(def.id)} />
              ))}
          </div>
        </section>
      ))}
    </main>
  )
}

function TypeCard({
  def,
  onCreate,
}: {
  def: (typeof registry)[string]
  onCreate: () => void
}) {
  return (
    <div className="type-card">
      {/* 시그니처 파스텔 + 핵심만 담은 정적 썸네일 */}
      <div className={`card-preview widget-card--bg-${def.signatureBg}`}>
        <def.Thumb />
      </div>
      <h3 className="type-card__name">{def.name}</h3>
      <p className="type-card__desc">{def.description}</p>
      <div className="card-actions">
        <button type="button" className="btn btn--sm" onClick={onCreate}>
          <Plus size={14} aria-hidden />
          만들기
        </button>
      </div>
    </div>
  )
}

function InstanceCard({
  instance,
  onEdit,
  onDelete,
}: {
  instance: WidgetInstance
  onEdit: () => void
  onDelete: () => void
}) {
  const def = registry[instance.type]
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>()
  const encoded = useMemo(() => {
    if (!def) return null
    try {
      return encodeConfig(def.schema, instance.config)
    } catch {
      return null // 손상된 저장 설정 — 링크 발급만 비활성
    }
  }, [def, instance.config])

  const copyEmbedUrl = async () => {
    if (!encoded) return
    const url = `${window.location.origin}/w/${instance.type}?c=${encoded}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('아래 URL을 직접 복사하세요', url)
    }
  }

  const instanceBg = (instance.config as { bg?: string }).bg ?? 'default'

  return (
    <div className="instance-card">
      {def && (
        <div className={`card-preview widget-card--bg-${instanceBg}`}>
          <def.Thumb />
        </div>
      )}
      <h3 className="instance-card__name">{instance.name}</h3>
      <span className="instance-card__meta">
        {def ? def.name : `알 수 없는 위젯 (${instance.type})`} ·{' '}
        {new Date(instance.createdAt).toLocaleDateString()}
      </span>
      <div className="card-actions">
        <button type="button" className="btn btn--sm btn--ghost" onClick={onEdit}>
          <Pencil size={14} aria-hidden />
          편집
        </button>
        <button
          type="button"
          className="btn btn--sm"
          onClick={copyEmbedUrl}
          disabled={!def}
        >
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          {copied ? '복사됨' : '링크 복사'}
        </button>
        <button type="button" className="btn btn--sm btn--danger" onClick={onDelete}>
          <Trash2 size={14} aria-hidden />
          삭제
        </button>
      </div>
    </div>
  )
}
