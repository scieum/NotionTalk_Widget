/**
 * Explore/My Widgets 카드용 정적 썸네일 — 글자·컨트롤 없이 위젯의 핵심만.
 * 파스텔 카드 배경 위에 그려지며, 색은 전부 토큰(--fg/--dial-face 등)에서 온다.
 */

export function ClockThumb() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="34" fill="var(--dial-face)" stroke="var(--border)" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="50"
          y1="19"
          x2="50"
          y2={i % 3 === 0 ? '24' : '22'}
          stroke="var(--dial-ink)"
          strokeWidth={i % 3 === 0 ? 2 : 1}
          strokeLinecap="round"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      {/* 10시 10분 — 클래식 워치 포즈 */}
      <line x1="50" y1="50" x2="39" y2="39" stroke="var(--dial-ink)" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="50" y1="50" x2="61" y2="33" stroke="var(--dial-ink)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="50" r="3.5" fill="var(--dial-ink)" />
    </svg>
  )
}

export function CalendarThumb() {
  const cells: JSX.Element[] = []
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 7; c++) {
      const today = r === 1 && c === 3
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={14 + c * 11}
          y={26 + r * 13}
          width="8"
          height="10"
          rx="2.5"
          fill={today ? 'var(--fg)' : 'var(--dial-face)'}
          fillOpacity={today ? 0.9 : 0.75}
        />,
      )
    }
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <rect x="14" y="17" width="26" height="5" rx="2.5" fill="var(--fg)" fillOpacity="0.5" />
      {cells}
    </svg>
  )
}

export function PomodoroThumb() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="36" fill="var(--dial-face)" stroke="var(--border)" strokeWidth="2" />
      {/* 남은 25분 부채꼴 (반시계) */}
      <path
        d="M 50 50 L 50 20 A 30 30 0 0 0 35.5 76.2 Z"
        fill="var(--accent-pink)"
        transform="scale(-1,1) translate(-100,0)"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="50"
          y1="17"
          x2="50"
          y2="21"
          stroke="var(--dial-tick)"
          strokeWidth="1.4"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="7" fill="var(--bg)" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  )
}

export function ClassTimerThumb() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <text
        x="50"
        y="53"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="27"
        fontWeight="800"
        fill="var(--fg)"
        style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}
      >
        05:00
      </text>
      <rect x="35" y="72" width="30" height="4" rx="2" fill="var(--fg)" fillOpacity="0.3" />
    </svg>
  )
}

export function SeatThumb() {
  const filled = new Set(['0-1', '1-3', '2-0'])
  const cells: JSX.Element[] = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={15 + c * 15}
          y={35 + r * 15}
          width="12"
          height="11"
          rx="3"
          fill={filled.has(`${r}-${c}`) ? 'var(--fg)' : 'var(--dial-face)'}
          fillOpacity={filled.has(`${r}-${c}`) ? 0.85 : 0.75}
        />,
      )
    }
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      {/* 칠판 */}
      <rect x="30" y="20" width="40" height="6" rx="3" fill="var(--fg)" fillOpacity="0.4" />
      {cells}
    </svg>
  )
}

export function DiceThumb() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <g transform="rotate(-8 38 46)">
        <rect x="20" y="28" width="36" height="36" rx="9" fill="var(--dial-face)" stroke="var(--border)" strokeWidth="1.5" />
        <circle cx="30" cy="38" r="3.2" fill="var(--fg)" fillOpacity="0.85" />
        <circle cx="46" cy="54" r="3.2" fill="var(--fg)" fillOpacity="0.85" />
      </g>
      <g transform="rotate(10 66 58)">
        <rect x="48" y="40" width="34" height="34" rx="8" fill="var(--dial-face)" stroke="var(--border)" strokeWidth="1.5" />
        <circle cx="57" cy="49" r="3" fill="var(--fg)" fillOpacity="0.85" />
        <circle cx="65" cy="57" r="3" fill="var(--fg)" fillOpacity="0.85" />
        <circle cx="73" cy="65" r="3" fill="var(--fg)" fillOpacity="0.85" />
      </g>
    </svg>
  )
}

export function LadderThumb() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      {[30, 50, 70].map((x) => (
        <line key={x} x1={x} y1="22" x2={x} y2="78" stroke="var(--fg)" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      ))}
      <line x1="30" y1="34" x2="50" y2="34" stroke="var(--fg)" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="50" x2="70" y2="50" stroke="var(--fg)" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="64" x2="50" y2="64" stroke="var(--fg)" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      {/* 강조 경로 */}
      <polyline
        points="30,22 30,34 50,34 50,50 70,50 70,78"
        fill="none"
        stroke="var(--fg)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function WeatherThumb() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      {/* 해 — 구름 뒤로 살짝 */}
      <circle cx="60" cy="40" r="13" fill="var(--fg)" fillOpacity="0.55" />
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i}
          x1="60"
          y1="21"
          x2="60"
          y2="26"
          stroke="var(--fg)"
          strokeOpacity="0.55"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${i * 45} 60 40)`}
        />
      ))}
      {/* 구름 */}
      <g fill="var(--dial-face)" stroke="var(--border)" strokeWidth="1.5">
        <circle cx="40" cy="56" r="12" />
        <circle cx="53" cy="52" r="14" />
        <circle cx="64" cy="58" r="10" />
        <rect x="30" y="56" width="44" height="12" rx="6" />
      </g>
    </svg>
  )
}

export function RandomThumb() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      <g transform="rotate(-10 50 50)">
        <rect x="32" y="32" width="36" height="36" rx="9" fill="var(--dial-face)" stroke="var(--border)" strokeWidth="1.5" />
        <circle cx="41" cy="41" r="3.4" fill="var(--fg)" fillOpacity="0.85" />
        <circle cx="59" cy="41" r="3.4" fill="var(--fg)" fillOpacity="0.85" />
        <circle cx="50" cy="50" r="3.4" fill="var(--fg)" fillOpacity="0.85" />
        <circle cx="41" cy="59" r="3.4" fill="var(--fg)" fillOpacity="0.85" />
        <circle cx="59" cy="59" r="3.4" fill="var(--fg)" fillOpacity="0.85" />
      </g>
    </svg>
  )
}
