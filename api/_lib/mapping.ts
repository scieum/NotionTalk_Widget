import { getDatabase } from './notion'

/**
 * 속성 자동 매핑 — apps/server/src/mapping.ts와 동일 규약.
 * 서버리스라 SQLite 대신 모듈 스코프 캐시(웜 인스턴스 동안 유지).
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
  if (ofType.length === 1) return ofType[0]!.name
  return null
}

const cache = new Map<string, PropertyMapping>()

export async function getMapping(
  token: string,
  dbId: string,
): Promise<PropertyMapping> {
  // 매핑은 DB 스키마에서 나오므로 캐시 키는 dbId만으로 충분 (토큰 무관)
  const cached = cache.get(dbId)
  if (cached) return cached

  const database = (await getDatabase(token, dbId)) as {
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
        `날짜(date)·분류(select)·시간(분)(number)·메모(rich_text) 구성을 권장합니다.`,
    )
  }

  const mapping: PropertyMapping = {
    date: date!,
    category: category!,
    minutes: minutes!,
    ...(memo ? { memo } : {}),
  }
  cache.set(dbId, mapping)
  return mapping
}

export function invalidateMapping(dbId: string): void {
  cache.delete(dbId)
}
