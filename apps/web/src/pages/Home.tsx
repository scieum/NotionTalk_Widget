import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { createInstance } from '../lib/instances'
import { registry } from '../widgets/registry'
import { CATEGORY_LABEL } from '../widgets/types'

/**
 * Explore — 위젯 종류 갤러리(카테고리별). 만든 위젯 목록은 /my(내 위젯)로 분리됨.
 */
export default function Home() {
  const navigate = useNavigate()

  const defs = Object.values(registry)
  const categories = [...new Set(defs.map((d) => d.category))]

  const create = (type: string) => {
    const instance = createInstance(type)
    navigate(`/edit/${instance.id}`)
  }

  return (
    <main className="home">
      <NavBar />
      <h1 className="home__title">Notion Widget Hub</h1>
      <p className="home__subtitle">
        위젯을 만들고 링크를 복사해 Notion에 <code>/embed</code>로 붙여넣으세요.
      </p>

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
