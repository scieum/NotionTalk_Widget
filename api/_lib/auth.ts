import { readCookie, type ApiRequest } from './http'
import { envToken } from './notion'
import { unseal } from './seal'

/**
 * 인증 이원화 — 요청에서 Notion 토큰을 해석한다.
 * 1) 위젯 토큰(wt): 임베드 iframe용. sealed {t, db} — 해당 DB로만 잠김.
 * 2) 세션 쿠키: 빌더 방문자용. OAuth 콜백이 sealed {t, w}를 심는다.
 * 3) 서버 환경변수 NOTION_TOKEN: 소유자 개인 모드(레거시 폴백).
 */

export const SESSION_COOKIE = 'nwh_notion'

export interface SessionPayload {
  /** Notion access token */
  t: string
  /** workspace 이름 (표시용) */
  w?: string
}

export interface WidgetTokenPayload {
  t: string
  /** 이 토큰으로 기록 가능한 유일한 DB */
  db: string
}

export interface AuthContext {
  token: string
  source: 'widget-token' | 'session' | 'env'
  /** 위젯 토큰인 경우 강제되는 DB ID */
  lockedDb?: string
}

export class WidgetTokenInvalidError extends Error {
  constructor() {
    super('위젯 토큰이 유효하지 않습니다. 위젯 편집에서 DB를 다시 연결하세요.')
  }
}

export function readSession(req: ApiRequest): SessionPayload | null {
  const payload = unseal<SessionPayload>(readCookie(req, SESSION_COOKIE))
  return payload && typeof payload.t === 'string' && payload.t ? payload : null
}

/**
 * wt가 명시된 요청에서 wt가 깨져 있으면(변조·키 회전) 폴백하지 않고 throw —
 * 임베드가 조용히 소유자 토큰(env)으로 기록하는 사고를 막는다.
 */
export function resolveAuth(req: ApiRequest, wt?: string | null): AuthContext | null {
  if (wt) {
    const payload = unseal<WidgetTokenPayload>(wt)
    if (!payload || typeof payload.t !== 'string' || typeof payload.db !== 'string') {
      throw new WidgetTokenInvalidError()
    }
    return { token: payload.t, source: 'widget-token', lockedDb: payload.db }
  }

  const session = readSession(req)
  if (session) return { token: session.t, source: 'session' }

  const env = envToken()
  if (env) return { token: env, source: 'env' }

  return null
}
