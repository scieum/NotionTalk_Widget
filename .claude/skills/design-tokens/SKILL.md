---
name: design-tokens
description: DESIGN.md 토큰의 적용 규칙 — 임베드 compact vs 전체화면 대형 타이포, 다크모드, 금지 사항. apps/web UI를 작업할 때 사용.
---

# 디자인 토큰 적용 규칙

원본: 루트 [DESIGN.md](../../../DESIGN.md). 토큰 정의는 `apps/web/src/styles/tokens.css` — **컴포넌트에서 hex 하드코딩 금지, CSS 커스텀 프로퍼티만 사용.**

## 핵심 토큰

| 토큰 | 라이트 | 다크 |
|------|--------|------|
| `--bg` | `#ffffff` | `#150f0f` |
| `--bg-alt` | `#f6f5f4` | `#2a2222` |
| `--fg` | `rgba(0,0,0,0.95)` | `#fafafa` |
| `--fg-secondary` | `#615d59` | (라이트 값 유지 불가 시 밝게) |
| `--fg-muted` | `#a39e98` | 동일 |
| `--border` | `rgba(0,0,0,0.1)` | `#322929` |
| `--primary` | `#5c5c5c` | 동일 (브랜드 앵커) |
| `--focus` | `#097fe8` | 동일 |

- 그림자: 다층 스택, 개별 opacity ≤ 0.05. 다크모드에서는 더 약하게.
- 반경: 버튼/입력 4px · 카드 12px · 배지 9999px.
- 스페이싱 8px 기반, 컴팩트(참조 대비 ~70%).
- 모션: 150/220/360ms, `cubic-bezier` ease만 — **스프링·바운스·오버슈트 금지**, `prefers-reduced-motion` 시 즉시 전환.

## 파스텔 위젯 카드 (스티커 스타일)

- 임베드 위젯은 `.widget-card` = 16px 라운드 + 소프트 그림자, 전체화면은 풀블리드.
- 전 위젯 공통 `bg` 설정 → `.widget-card--bg-<name>` 변형이 `--bg`/`--fg`/`--fg-secondary`/`--fg-muted`/`--border`를 카드 색으로 재정의한다. **위젯 컴포넌트는 변수만 쓰면 파스텔 배경이 공짜로 적용된다.**
- 팔레트(`--pastel-*`): charcoal `#3d3d3b`(흰 글자) · pink `#f3d9de` · mint `#cfe9e3` · green `#cde5cf` · blue `#5d8cb3`(흰 글자) · purple `#cabcec` · sand `#d8c3a5`. 어두운 카드(charcoal/blue)만 밝은 전경.
- 공통 스키마 필드는 core `schemas/common.ts`(themeField/accentField/bgField) — 새 위젯은 반드시 이 3종을 포함.

## 레이아웃 모드 (동일 컴포넌트, 모드만 분기)

| | 임베드 `/w/` | 전체화면 `/f/` |
|---|---|---|
| 용도 | Notion iframe 안 | 프로젝터/교실 |
| 타이포 | 컴팩트, iframe 뷰포트 기준 vw/vmin | **초대형 vw/vmin 타이포** — 교실 뒤에서도 판독 |
| 여백 | 최소 (8~12px) | 넉넉 |
| 크롬 | 호버 시에만 "전체화면 열기" 링크 노출 | 없음 (콘텐츠만) |

- iframe 안에서는 vw = iframe 폭이므로 양쪽 모두 뷰포트 단위 타이포가 안전하다. px 고정 크기 금지.
- 임베드는 배경을 `--bg`로 꽉 채운다(iframe 여백 보이지 않게).

## 다크모드

- `.dark` 클래스 스코프 단일 소스(media query 이중화 금지).
- 위젯 설정 `theme: auto | light | dark` — `auto`는 `matchMedia('(prefers-color-scheme: dark)')`를 구독해 클래스 토글.

## 금지 사항

- 이모지 금지 — Lucide 아이콘(단일 라이브러리) 또는 컬러 닷만.
- 순흑 `#000000`, 블루그레이(`#9ca3af` 류) 금지 — 웜 뉴트럴만.
- 액센트는 `--primary` 하나. 장식용 파랑 산포 금지. 상태 색은 DESIGN.md 시맨틱(teal/green/orange)만.
- 보더 1px 초과 금지(입력 밑줄 2px 예외), 단층 진한 그림자 금지.
