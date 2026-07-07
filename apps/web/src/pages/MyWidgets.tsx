import { encodeConfig } from '@nwh/core'
import { Check, Copy, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import {
  deleteInstance,
  listInstances,
  type WidgetInstance,
} from '../lib/instances'
import { registry } from '../widgets/registry'

/** 내 위젯 — 만든 위젯 인스턴스 목록(localStorage). 종류 갤러리는 Explore(/)로 분리됨. */
export default function MyWidgets() {
  const navigate = useNavigate()
  const [instances, setInstances] = useState<WidgetInstance[]>(listInstances)

  const remove = (instance: WidgetInstance) => {
    if (!window.confirm(`'${instance.name}' 위젯을 삭제할까요?`)) return
    deleteInstance(instance.id)
    setInstances(listInstances())
  }

  return (
    <main className="home">
      <NavBar />
      <h1 className="home__title">내 위젯</h1>
      <p className="home__subtitle">
        만든 위젯을 편집하거나 임베드 링크를 다시 복사할 수 있어요.
      </p>

      {instances.length === 0 ? (
        <p className="empty-hint">
          아직 만든 위젯이 없습니다. Explore에서 종류를 골라 만들어 보세요.
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
    </main>
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
