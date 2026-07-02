---
name: widget-config
description: 위젯 설정 문자열(?c=)의 스키마·인코딩·폴백 규약. 위젯 설정 스키마를 추가/변경하거나 URL 발급 코드를 작업할 때 사용.
---

# 위젯 설정 문자열 규약

## 파이프라인

```
zod 스키마(packages/core) → JSON.stringify → lz-string compressToEncodedURIComponent → ?c=
```

- 인코딩/디코딩은 반드시 `packages/core`의 `encodeConfig` / `decodeConfig`를 통해서만 한다. 위젯이나 빌더에서 직접 lz-string을 호출하지 않는다.
- `compressToEncodedURIComponent`는 URI-safe(base64url 계열) 출력을 보장하므로 추가 인코딩 불필요.

## 스키마 규칙

1. **모든 필드는 `.default()`를 가진다** — `schema.parse({})`가 항상 성공해야 폴백이 성립한다. 새 필드 추가 시 필수.
2. **`.strict()` 금지** — 구버전 URL에 없는 키·제거된 키가 있어도 파싱돼야 한다(전방 호환). zod 기본 strip 동작을 유지한다.
3. 스키마는 위젯당 1개, `packages/core/src/schemas/<widget>.ts`에 두고 web에서는 registry를 통해서만 참조.
4. 필드 제거 시: 그냥 지우면 된다(strip이 흡수). 필드 의미 변경 시: 새 이름으로 추가하고 옛 이름은 지운다 — 같은 이름 재사용 금지.

## 폴백 규약 (빈 화면 금지)

`decodeConfig`는 throw하지 않고 항상 렌더 가능한 값을 돌려준다:

| 상황 | reason | UI 처리 |
|------|--------|---------|
| `c` 없음/빈 문자열 | `empty` | 기본 설정 렌더, **배지 없음** (URL 직접 방문은 정상 경로) |
| 압축 해제/JSON 파싱 실패 | `malformed` | 기본 설정 렌더 + "기본 설정으로 표시 중" 배지 |
| zod 검증 실패 | `invalid` | 기본 설정 렌더 + 배지 |

발급 측(빌더)은 반대로 **엄격**: `encodeConfig`는 스키마 불일치 시 throw → 발급 차단 + 입력 오류 표시.

## 테스트 (Vitest, core 필수)

- 왕복 동일성: `decodeConfig(s, encodeConfig(s, x)).value ≡ s.parse(x)`
- 변조 문자열 → `malformed` 폴백, 타입 불일치 JSON → `invalid` 폴백
- `schema.parse({})` 성공 (전 위젯 스키마 공통 테스트)

## 저장 위치 규약

- 일반 설정: URL(`?c=`) 기본, localStorage는 빌더의 "마지막 설정 복원" 보조용
- **학생 명단은 예외**: localStorage 기본(프리셋 최대 10개). URL 인코딩은 "학생 이름이 링크에 포함됩니다" 고지 후에만. 명단은 서버로 절대 보내지 않는다.
