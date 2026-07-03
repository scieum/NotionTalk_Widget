import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * sealed 토큰 — 서버 키(AES-256-GCM)로 암호화한 JSON.
 * Notion access token을 DB 없이 세션 쿠키/위젯 토큰에 담기 위한 장치로,
 * 브라우저에는 암호문만 내려가고(시크릿 경계) 복호화는 서버에서만 가능하다.
 * 키 회전(NWH_SEAL_KEY 변경) 시 기존 세션·위젯 토큰은 전부 무효화된다.
 */

const PREFIX = 'v1'

export class SealKeyMissingError extends Error {
  constructor() {
    super('NWH_SEAL_KEY가 설정되지 않았습니다')
  }
}

function key(): Buffer {
  const raw = process.env.NWH_SEAL_KEY?.trim()
  if (!raw) throw new SealKeyMissingError()
  // 임의 문자열 허용 — SHA-256으로 32바이트 키 유도
  return createHash('sha256').update(raw).digest()
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url')
}

export function seal(payload: unknown): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const plain = Buffer.from(JSON.stringify(payload), 'utf8')
  const enc = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}.${b64url(iv)}.${b64url(tag)}.${b64url(enc)}`
}

/** 복호화 실패(변조·키 회전·형식 오류)는 null */
export function unseal<T>(sealed: string | undefined | null): T | null {
  if (!sealed) return null
  const parts = sealed.split('.')
  if (parts.length !== 4 || parts[0] !== PREFIX) return null
  try {
    const iv = Buffer.from(parts[1]!, 'base64url')
    const tag = Buffer.from(parts[2]!, 'base64url')
    const enc = Buffer.from(parts[3]!, 'base64url')
    const decipher = createDecipheriv('aes-256-gcm', key(), iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(enc), decipher.final()])
    return JSON.parse(plain.toString('utf8')) as T
  } catch {
    return null
  }
}
