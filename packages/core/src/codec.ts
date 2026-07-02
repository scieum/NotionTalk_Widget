// CJS 모듈 — Node ESM(서버)과 Vite(웹) 양쪽 호환을 위해 default import
import lzString from 'lz-string'
import type { z } from 'zod'

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = lzString

/**
 * 설정 문자열 코덱 (?c= 규약)
 *
 * zod 스키마 → JSON → lz-string(URI-safe) → ?c=
 *
 * 전제: 모든 위젯 스키마는 전 필드 .default()를 가져 schema.parse({})가
 * 항상 성공한다. 이것이 폴백의 근거다. (.claude/skills/widget-config 참조)
 */

export type DecodeFailReason = 'empty' | 'malformed' | 'invalid'

/**
 * lz-string의 URI-safe 알파벳에는 '+'와 '$'가 포함된다.
 * URLSearchParams는 쿼리의 '+'를 공백으로 해석하므로 그대로 두면
 * 위젯 측 디코딩이 깨진다 → RFC 3986 unreserved 문자('.', '_')로 치환.
 */
function toUrlSafe(s: string): string {
  return s.replace(/\+/g, '.').replace(/\$/g, '_')
}

function fromUrlSafe(s: string): string {
  return s.replace(/\./g, '+').replace(/_/g, '$')
}

export type DecodeResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: DecodeFailReason; value: T }

/**
 * 발급 측(빌더) 전용 — 스키마 불일치 시 throw하여 발급을 차단한다.
 */
export function encodeConfig<S extends z.ZodTypeAny>(
  schema: S,
  config: z.input<S>,
): string {
  const parsed = schema.parse(config) as z.output<S>
  return toUrlSafe(compressToEncodedURIComponent(JSON.stringify(parsed)))
}

/**
 * 렌더 측(위젯) 전용 — 절대 throw하지 않고 항상 렌더 가능한 값을 반환한다.
 * ok:false여도 value에는 기본 설정이 담긴다 (빈 화면 금지).
 */
export function decodeConfig<S extends z.ZodTypeAny>(
  schema: S,
  raw: string | null | undefined,
): DecodeResult<z.output<S>> {
  const fallback = schema.parse({}) as z.output<S>

  if (raw == null || raw === '') {
    return { ok: false, reason: 'empty', value: fallback }
  }

  let json: unknown
  try {
    const decompressed = decompressFromEncodedURIComponent(fromUrlSafe(raw))
    if (!decompressed) {
      return { ok: false, reason: 'malformed', value: fallback }
    }
    json = JSON.parse(decompressed)
  } catch {
    return { ok: false, reason: 'malformed', value: fallback }
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return { ok: false, reason: 'invalid', value: fallback }
  }
  return { ok: true, value: parsed.data as z.output<S> }
}
