/**
 * 주소 → 좌표 (Nominatim/OSM, 키 불필요).
 * 사용 정책(≤1 req/s) 준수: 네트워크 조회는 순차 + 1.1초 간격.
 * 성공 결과는 localStorage에 영구 캐시 — 같은 DB를 다시 열면 즉시 표시된다.
 */

const CACHE_KEY = 'nwh:geocode:v1'

export type LatLon = [number, number]

function loadCache(): Record<string, LatLon> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, LatLon>)
      : {}
  } catch {
    return {}
  }
}

function saveCache(cache: Record<string, LatLon>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* 저장 실패는 무시 */
  }
}

export interface GeoResult {
  name: string
  lat: number
  lon: number
}

/** 장소/주소 검색 — 설정 폼용 (상위 5건) */
export async function searchPlace(query: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '5',
    'accept-language': 'ko',
    q: query,
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!res.ok) throw new Error(`geocoding http ${res.status}`)
  const body = (await res.json()) as {
    display_name?: string
    lat?: string
    lon?: string
  }[]
  return body
    .map((r) => ({
      name: r.display_name ?? '',
      lat: Number(r.lat),
      lon: Number(r.lon),
    }))
    .filter((r) => r.name && Number.isFinite(r.lat) && Number.isFinite(r.lon))
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function geocodeOne(address: string): Promise<LatLon | null> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    'accept-language': 'ko',
    q: address,
  })
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
    if (!res.ok) return null
    const body = (await res.json()) as { lat?: string; lon?: string }[]
    const first = body[0]
    if (!first) return null
    const lat = Number(first.lat)
    const lon = Number(first.lon)
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null
  } catch {
    return null
  }
}

/**
 * 주소 일괄 변환 — 캐시 히트는 즉시, 미스만 순차 조회.
 * 실패한 주소는 결과 맵에 null (캐시에는 저장하지 않아 다음에 재시도).
 */
export async function geocodeAll(
  addresses: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, LatLon | null>> {
  const cache = loadCache()
  const result = new Map<string, LatLon | null>()
  const unique = [...new Set(addresses.map((a) => a.trim()).filter(Boolean))]
  const misses = unique.filter((a) => !cache[a])

  for (const address of unique) {
    if (cache[address]) result.set(address, cache[address]!)
  }
  onProgress?.(unique.length - misses.length, unique.length)

  let done = unique.length - misses.length
  for (const [i, address] of misses.entries()) {
    if (i > 0) await sleep(1100)
    const coords = await geocodeOne(address)
    result.set(address, coords)
    if (coords) {
      cache[address] = coords
      saveCache(cache)
    }
    done += 1
    onProgress?.(done, unique.length)
  }
  return result
}
