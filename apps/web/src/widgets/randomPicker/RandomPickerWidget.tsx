import {
  ACCENT_CSS_VAR,
  drawStudents,
  hashSeed,
  type RandomPickerConfig,
} from '@nwh/core'
import { Dices, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import RosterPanel from '../../components/RosterPanel'
import type { RosterPreset } from '../../lib/roster'
import type { WidgetProps } from '../types'

export default function RandomPickerWidget({
  config,
  layout,
}: WidgetProps<RandomPickerConfig>) {
  const [roster, setRoster] = useState<RosterPreset | null>(null)
  const [pickedAll, setPickedAll] = useState<string[]>([])
  const [current, setCurrent] = useState<string[] | null>(null)
  const [rolling, setRolling] = useState(false)
  const [rollText, setRollText] = useState('')
  const [exhausted, setExhausted] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => timers.current.forEach((t) => window.clearInterval(t)),
    [],
  )

  // 명단이 바뀌면 세션 초기화
  useEffect(() => {
    setPickedAll([])
    setCurrent(null)
    setExhausted(false)
  }, [roster?.id])

  const students = roster?.students ?? []
  const remainingPool = config.allowRepeat
    ? students
    : students.filter((s) => !pickedAll.includes(s))

  const draw = () => {
    if (students.length === 0 || rolling) return
    setRolling(true)
    setCurrent(null)

    // 룰렛 연출 — 명단을 빠르게 순환 (결과는 core가 시드로 결정)
    let i = 0
    const roll = window.setInterval(() => {
      setRollText(students[i % students.length]!)
      i += 1
    }, 70)
    timers.current.push(roll)

    const finish = window.setTimeout(() => {
      window.clearInterval(roll)
      const result = drawStudents({
        roster: students,
        count: config.count,
        exclude: config.allowRepeat ? [] : pickedAll,
        allowRepeat: config.allowRepeat,
        seed: hashSeed(crypto.randomUUID()),
      })
      setCurrent(result.picked)
      setExhausted(result.exhausted)
      if (!config.allowRepeat) {
        setPickedAll((prev) => [...prev, ...result.picked])
      }
      setRolling(false)
    }, 900)
    timers.current.push(finish)
  }

  const resetSession = () => {
    setPickedAll([])
    setCurrent(null)
    setExhausted(false)
  }

  const accent = ACCENT_CSS_VAR[config.accent]
  const resultFontSize =
    layout === 'fullscreen'
      ? `min(${current && current.length > 2 ? 9 : 14}vw, 26vh)`
      : `min(${current && current.length > 2 ? 7 : 11}vw, 22vh)`

  return (
    <div className={`tool${layout === 'fullscreen' ? ' tool--fullscreen' : ''}`}>
      <RosterPanel onRoster={setRoster} />

      <div
        className="draw-result"
        style={{
          fontSize: resultFontSize,
          color: rolling ? 'var(--fg-muted)' : accent,
          minHeight: '1.3em',
        }}
      >
        {rolling
          ? rollText
          : current
            ? current.join(' · ')
            : students.length > 0
              ? '?'
              : ''}
      </div>

      {students.length === 0 && (
        <span className="tool__hint">명단을 먼저 만들어 주세요.</span>
      )}

      {config.showPicked && !config.allowRepeat && pickedAll.length > 0 && (
        <div className="picked-chips">
          {pickedAll.map((s, i) => (
            <span key={`${s}-${i}`} className="chip-static">
              {s}
            </span>
          ))}
        </div>
      )}

      {exhausted && (
        <span className="tool__hint">
          남은 학생이 없어요. 처음부터 다시 시작하세요.
        </span>
      )}

      <div className="tool__controls">
        <button
          type="button"
          className="btn"
          onClick={draw}
          disabled={rolling || students.length === 0 || (!config.allowRepeat && remainingPool.length === 0)}
        >
          <Dices size={16} aria-hidden />
          {config.count}명 뽑기
        </button>
        {!config.allowRepeat && pickedAll.length > 0 && (
          <button type="button" className="btn btn--ghost" onClick={resetSession}>
            <RotateCcw size={16} aria-hidden />
            처음부터
          </button>
        )}
      </div>

      {!config.allowRepeat && students.length > 0 && (
        <span className="tool__hint">
          남은 학생 {remainingPool.length} / {students.length}명
        </span>
      )}
    </div>
  )
}
