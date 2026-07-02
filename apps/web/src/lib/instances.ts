import { registry } from '../widgets/registry'

/**
 * "My Widgets" 인스턴스 스토어 — localStorage 완결 (서버 없음).
 * 인스턴스 = 위젯 종류 + 이름 + 설정. 임베드 URL은 인스턴스와 무관하게
 * 설정 문자열로 완결되므로, 여기는 빌더 편의용 저장소일 뿐이다.
 */

const STORE_KEY = 'nwh:instances'

export interface WidgetInstance {
  id: string
  type: string
  name: string
  config: Record<string, unknown>
  createdAt: number
}

function isInstance(v: unknown): v is WidgetInstance {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.type === 'string' &&
    typeof o.name === 'string' &&
    typeof o.config === 'object' &&
    o.config !== null &&
    typeof o.createdAt === 'number'
  )
}

export function listInstances(): WidgetInstance[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isInstance)
  } catch {
    return []
  }
}

function save(instances: WidgetInstance[]): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(instances))
}

export function getInstance(id: string): WidgetInstance | undefined {
  return listInstances().find((i) => i.id === id)
}

export function createInstance(type: string): WidgetInstance {
  const def = registry[type]
  if (!def) throw new Error(`알 수 없는 위젯 종류: ${type}`)
  const instance: WidgetInstance = {
    id: crypto.randomUUID(),
    type,
    name: def.name,
    // 위젯 종류의 시그니처 파스텔이 기본 배경 (편집에서 변경 가능)
    config: def.schema.parse({ bg: def.signatureBg }) as Record<string, unknown>,
    createdAt: Date.now(),
  }
  save([instance, ...listInstances()])
  return instance
}

export function updateInstance(
  id: string,
  patch: Partial<Pick<WidgetInstance, 'name' | 'config'>>,
): void {
  save(
    listInstances().map((i) => (i.id === id ? { ...i, ...patch } : i)),
  )
}

export function deleteInstance(id: string): void {
  save(listInstances().filter((i) => i.id !== id))
}
