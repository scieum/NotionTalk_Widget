import { clearMapping, loadMapping, saveMapping } from './db'
import { getDatabase } from './notion'

/**
 * 속성 자동 매핑 — 타입 + 이름 후보군(한/영)으로 추정 (§5.3).
 * 이후 모든 읽기/쓰기는 이 매핑을 통해서만 속성에 접근한다 (하드코딩 금지).
 */

export interface PropertyMapping {
  date: string
  category: string
  minutes: string
  memo?: string
}

export class MappingError extends Error {}

const CANDIDATES: Record<'date' | 'category' | 'minutes' | 'memo', string[]> = {
  date: ['날짜', '일자', 'date', 'day'],
  category: ['분류', '카테고리', '종류', 'category', 'type'],
  minutes: ['시간(분)', '시간', '분', 'minutes', 'duration', 'time'],
  memo: ['메모', '노트', '비고', 'memo', 'note'],
}

const REQUIRED_TYPE: Record<'date' | 'category' | 'minutes' | 'memo', string> = {
  date: 'date',
  category: 'select',
  minutes: 'number',
  memo: 'rich_text',
}

function pick(
  props: { name: string; type: string }[],
  key: 'date' | 'category' | 'minutes' | 'memo',
): string | null {
  const ofType = props.filter((p) => p.type === REQUIRED_TYPE[key])
  if (ofType.length === 0) return null
  const wanted = CANDIDATES[key]
  const byName = ofType.find((p) =>
    wanted.some((w) => p.name.trim().toLowerCase() === w.toLowerCase()),
  )
  if (byName) return byName.name
  if (ofType.length === 1) return ofType[0]!.name // 그 타입이 하나뿐이면 그것
  return null
}

async function computeMapping(dbId: string): Promise<PropertyMapping> {
  const database = (await getDatabase(dbId)) as {
    properties?: Record<string, { type: string }>
  }
  const props = Object.entries(database.properties ?? {}).map(([name, p]) => ({
    name,
    type: p.type,
  }))

  const date = pick(props, 'date')
  const category = pick(props, 'category')
  const minutes = pick(props, 'minutes')
  const memo = pick(props, 'memo')

  const missing = [
    !date && '날짜(date)',
    !category && '분류(select)',
    !minutes && '시간(분)(number)',
  ].filter(Boolean)
  if (missing.length > 0) {
    throw new MappingError(
      `기록 DB에서 필수 속성을 찾지 못했습니다: ${missing.join(', ')}. ` +
        `공식 템플릿(날짜·분류·시간(분)·메모) 구성을 권장합니다.`,
    )
  }

  return { date: date!, category: category!, minutes: minutes!, ...(memo ? { memo } : {}) }
}

export async function getMapping(dbId: string): Promise<PropertyMapping> {
  const cached = loadMapping(dbId)
  if (cached && cached.date && cached.category && cached.minutes) {
    return cached as unknown as PropertyMapping
  }
  const mapping = await computeMapping(dbId)
  saveMapping(dbId, mapping as unknown as Record<string, string>)
  return mapping
}

/** 스키마가 바뀌어 쓰기 실패한 경우 — 매핑 무효화 후 1회 재계산용 */
export function invalidateMapping(dbId: string): void {
  clearMapping(dbId)
}
