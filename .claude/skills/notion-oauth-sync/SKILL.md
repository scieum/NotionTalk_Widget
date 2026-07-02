---
name: notion-oauth-sync
description: Notion OAuth 흐름·위젯 토큰·속성 매핑·기록 append·중복 방지 규약. apps/server의 연동 코드를 작업할 때 사용.
---

# Notion 연동 규약 (연동 계층 전용)

> **현재 구현 단계**: 내부 통합 토큰 모드 — 서버 `.env`의 `NOTION_TOKEN` + 위젯 설정 DB ID.
> 아래 OAuth·위젯 토큰 규약은 공개 통합 심사 후 도입할 목표 설계다.
> 매핑·append-only·멱등성 규약은 현 구현(`apps/server`)에 이미 적용돼 있다.

## 인증 이원화

| 컨텍스트 | 방식 |
|----------|------|
| 빌더(직접 방문) | Notion OAuth → 퍼스트파티 세션 쿠키 |
| 임베드(iframe) | URL 내 **HMAC 서명 위젯 토큰** — 서드파티 쿠키는 iframe에서 차단됨 |

- 위젯 토큰 = `{userId, widgetType, scope(read|read_write), tokenVersion}` + HMAC 서명. 만료 무기한, **재발급 시 tokenVersion 증가로 이전 토큰 전부 무효화**.
- Notion access token은 SQLite에 **암호화 저장**(키는 환경변수). 어떤 응답에도 브라우저로 내려보내지 않는다.
- 시크릿(서명 키, 암호화 키, OAuth client secret)은 `apps/server` 환경변수에만 존재.

## 속성 매핑 (공개 배포의 핵심 문제)

- 필수 4종: `날짜`(date) · `분류`(select) · `시간(분)`(number) · `메모`(rich_text, 선택)
- 자동 매핑: 속성 **타입 + 이름 후보군(한/영)** 으로 추정 → 미리보기로 사용자 확인 → 실패 시 수동 매핑 UI
- 매핑 결과는 사용자·DB 단위로 SQLite 저장. **모든 읽기/쓰기는 매핑 테이블을 통해서만 속성 접근 — 속성명 하드코딩 금지.**

## 읽기 (대시보드)

```
위젯 토큰 검증 → 캐시 확인(TTL 30~60초) → miss 시 Notion query(기간 필터)
→ zod 검증 → core 집계 → 응답
```

- 실패 시 재시도 3회(지수 백오프) → 직전 캐시 + `DEGRADED` 표시. 레이트리밋 ~3 req/s 준수.
- 토큰 검증 실패 → 401 + 위젯에 "재발급 필요" 안내.

## 쓰기 (기록 입력 · 뽀모도로 자동기록)

- **append-only**: 행 생성만. 수정·삭제 API 호출 금지(코드 경로 자체를 만들지 않는다).
- 시스템이 채우는 속성은 매핑된 필수 속성 + 선택 `출처` 태그뿐.
- 뽀모도로 자동기록 멱등키 = 클라이언트 세션 UUID. 동일 UUID 재전송은 스킵 + 로그(세션당 정확히 1행).
- 쓰기 실패: 재시도 3회 → 클라이언트 localStorage 대기열 보관 + 재전송 버튼. **기록 유실 금지.** 대기열 스냅샷은 `output/write_queue.json`.

## 상태 전이

`ANONYMOUS → CONNECTED → (DEGRADED ⇄ CONNECTED) → REVOKED`

- `DEGRADED`: 연속 실패 — 캐시 표시 유지, 쓰기는 대기열로
- `REVOKED`: 통합 해제 감지 — 재인가 유도, 로컬 기능은 계속 동작
