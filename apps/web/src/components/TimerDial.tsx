/**
 * Time Timer 스타일 다이얼 — 남은 시간이 12시 방향에서 반시계로 펼쳐진
 * 색 부채꼴로 표시되고, 시간이 흐르면 부채꼴이 줄어든다. 60분 스케일.
 */

const CX = 100
const CY = 100
const PIE_R = 66
const FACE_R = 82
const LABEL_R = 90

function polar(angleDeg: number, radius: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)]
}

export default function TimerDial({
  remainingMs,
  color,
  size,
  soft = false,
}: {
  remainingMs: number
  /** 부채꼴 색 (CSS 값) */
  color: string
  /** CSS 크기 (정사각) */
  size: string
  /** 휴식 등 보조 페이즈 — 부채꼴을 연하게 */
  soft?: boolean
}) {
  const fraction = Math.max(0, Math.min(1, remainingMs / 3_600_000))
  // 12시 기준 반시계 방향 부채꼴
  const endAngle = -90 - fraction * 360
  const [sx, sy] = polar(-90, PIE_R)
  const [ex, ey] = polar(endAngle, PIE_R)
  const largeArc = fraction > 0.5 ? 1 : 0

  return (
    <svg
      viewBox="0 0 200 200"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`남은 시간 ${Math.ceil(remainingMs / 60000)}분`}
    >
      <circle
        cx={CX}
        cy={CY}
        r={FACE_R}
        fill="var(--dial-face)"
        stroke="var(--border)"
        strokeWidth="2"
      />

      {/* 부채꼴 (남은 시간) */}
      {fraction >= 1 ? (
        <circle cx={CX} cy={CY} r={PIE_R} fill={color} fillOpacity={soft ? 0.45 : 1} />
      ) : (
        fraction > 0 && (
          <path
            d={`M ${CX} ${CY} L ${sx.toFixed(2)} ${sy.toFixed(2)} A ${PIE_R} ${PIE_R} 0 ${largeArc} 0 ${ex.toFixed(2)} ${ey.toFixed(2)} Z`}
            fill={color}
            fillOpacity={soft ? 0.45 : 1}
          />
        )
      )}

      {/* 눈금 — 60개(분), 5분마다 굵게 */}
      {Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0
        const angle = -90 - i * 6
        const [x1, y1] = polar(angle, PIE_R + 4)
        const [x2, y2] = polar(angle, PIE_R + (major ? 12 : 8))
        return (
          <line
            key={i}
            x1={x1.toFixed(2)}
            y1={y1.toFixed(2)}
            x2={x2.toFixed(2)}
            y2={y2.toFixed(2)}
            stroke={major ? 'var(--dial-ink)' : 'var(--dial-tick)'}
            strokeWidth={major ? 1.6 : 1}
          />
        )
      })}

      {/* 분 라벨 — 00부터 반시계로 05, 10, … 55 (Time Timer 방식) */}
      {Array.from({ length: 12 }, (_, i) => {
        const [x, y] = polar(-90 - i * 30, LABEL_R)
        return (
          <text
            key={i}
            x={x.toFixed(2)}
            y={y.toFixed(2)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="8.5"
            fontWeight="600"
            fill="var(--dial-ink)"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {String(i * 5).padStart(2, '0')}
          </text>
        )
      })}

      {/* 가운데 노브 — 카드(본체) 색과 맞춤 */}
      <circle
        cx={CX}
        cy={CY}
        r={15}
        fill="var(--bg)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      <circle cx={CX} cy={CY} r={5} fill={color} fillOpacity={soft ? 0.45 : 1} />
    </svg>
  )
}
