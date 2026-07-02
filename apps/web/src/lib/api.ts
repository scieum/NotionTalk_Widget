/**
 * API 베이스 — 같은 도메인(/api) 기본:
 * 배포판은 Vercel 서버리스 함수, 개발은 vite 프록시 → Express(8787).
 * 서버를 분리 배포하면 VITE_API_BASE로 지정.
 */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? ''
