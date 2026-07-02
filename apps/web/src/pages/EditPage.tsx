import { encodeConfig } from '@nwh/core'
import { ArrowLeft, Check, Copy } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getInstance, updateInstance } from '../lib/instances'
import { registry } from '../widgets/registry'

/**
 * 위젯 편집 — 좌: 제목·설정·링크 발급 박스 / 우: 미리보기.
 * 변경은 즉시 localStorage에 저장된다(자동 저장).
 */
export default function EditPage() {
  const { id = '' } = useParams()
  const [instance] = useState(() => getInstance(id))
  const def = instance ? registry[instance.type] : undefined

  const [name, setName] = useState(instance?.name ?? '')
  const [config, setConfig] = useState<Record<string, unknown>>(() => {
    if (!def) return {}
    // 손상된 저장 설정은 기본값으로 폴백 (빈 화면 금지 규약과 동일)
    const parsed = def.schema.safeParse(instance?.config ?? {})
    return (
      parsed.success ? parsed.data : def.schema.parse({})
    ) as Record<string, unknown>
  })

  if (!instance || !def) {
    return (
      <main className="home">
        <p className="empty-hint">
          위젯을 찾을 수 없습니다. <Link to="/">홈으로</Link>
        </p>
      </main>
    )
  }

  const onName = (value: string) => {
    setName(value)
    updateInstance(instance.id, { name: value })
  }

  const onConfig = (value: Record<string, unknown>) => {
    setConfig(value)
    updateInstance(instance.id, { config: value })
  }

  return <Editor def={def} name={name} config={config} onName={onName} onConfig={onConfig} />
}

function Editor({
  def,
  name,
  config,
  onName,
  onConfig,
}: {
  def: (typeof registry)[string]
  name: string
  config: Record<string, unknown>
  onName: (name: string) => void
  onConfig: (config: Record<string, unknown>) => void
}) {
  const encoded = useMemo(() => encodeConfig(def.schema, config), [def, config])
  const embedUrl = `${window.location.origin}/w/${def.id}?c=${encoded}`
  const fullUrl = `${window.location.origin}/f/${def.id}?c=${encoded}`

  return (
    <main className="home">
      <Link to="/" className="back-link">
        <ArrowLeft size={14} aria-hidden />
        My Widgets
      </Link>
      <h1 className="home__title">{def.name} 설정</h1>

      <div className="home__grid home__grid--stretch">
        <section aria-label="위젯 설정">
          <div className="panel">
            <label className="field" style={{ display: 'block' }}>
              제목
              <input
                type="text"
                value={name}
                onChange={(e) => onName(e.target.value)}
                placeholder="위젯 이름"
                style={{ width: '100%', marginTop: 4 }}
              />
            </label>
            <def.SettingsForm config={config} onChange={onConfig} />
          </div>

          <div className="link-box">
            <LinkField label="Notion 임베드 링크" url={embedUrl} />
            <LinkField label="전체화면 링크" url={fullUrl} />
            <p className="link-box__hint">
              Notion에서 <code>/embed</code> → 임베드 링크 붙여넣기. (현재 설정이
              링크에 포함됨)
            </p>
          </div>
        </section>

        <section aria-label="미리보기" className="edit-preview-col">
          <p className="preview-label">미리보기</p>
          <div className="preview">
            {/* iframe이라 vw/vmin 타이포가 실제 임베드와 동일하게 보인다 */}
            <iframe
              title="위젯 미리보기"
              src={`/w/${def.id}?c=${encoded}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function LinkField({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('아래 URL을 직접 복사하세요', url)
    }
  }

  return (
    <div className="link-box__group">
      <span className="link-box__label">{label}</span>
      <div className="link-box__row">
        <input type="text" readOnly value={url} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn--sm" onClick={copy}>
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
    </div>
  )
}
