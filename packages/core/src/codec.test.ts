import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { decodeConfig, encodeConfig } from './codec'
import { calendarConfigSchema } from './schemas/calendar'
import { classTimerConfigSchema } from './schemas/classTimer'
import { clockConfigSchema } from './schemas/clock'
import { pomodoroConfigSchema } from './schemas/pomodoro'
import { randomPickerConfigSchema } from './schemas/randomPicker'
import { seatPickerConfigSchema } from './schemas/seatPicker'
import { weatherConfigSchema } from './schemas/weather'

const allSchemas = {
  clock: clockConfigSchema,
  calendar: calendarConfigSchema,
  pomodoro: pomodoroConfigSchema,
  classTimer: classTimerConfigSchema,
  seatPicker: seatPickerConfigSchema,
  randomPicker: randomPickerConfigSchema,
  weather: weatherConfigSchema,
}

describe('설정 코덱 왕복', () => {
  it('인코딩→디코딩 왕복 동일성 (기본값)', () => {
    const encoded = encodeConfig(clockConfigSchema, {})
    const result = decodeConfig(clockConfigSchema, encoded)
    expect(result.ok).toBe(true)
    expect(result.value).toEqual(clockConfigSchema.parse({}))
  })

  it('인코딩→디코딩 왕복 동일성 (전 필드 지정)', () => {
    const input = {
      mode: 'analog',
      hour12: true,
      showDate: false,
      showSeconds: false,
      theme: 'dark',
      accent: 'teal',
      size: 'l',
      bg: 'pink',
    } as const
    const result = decodeConfig(
      clockConfigSchema,
      encodeConfig(clockConfigSchema, input),
    )
    expect(result.ok).toBe(true)
    // 지정한 필드는 그대로, 나머지는 기본값 — 필드 추가에 견고하게
    expect(result.value).toEqual(clockConfigSchema.parse(input))
    expect(result.value).toMatchObject(input)
  })

  it('출력이 URI-safe (재인코딩 불필요)', () => {
    const encoded = encodeConfig(clockConfigSchema, { mode: 'analog' })
    expect(encoded).toBe(encodeURIComponent(encoded))
  })

  it('URLSearchParams 왕복에도 안전 (+ → 공백 문제)', () => {
    // { mode: 'analog' } 인코딩은 치환 전 알파벳 기준 '+'를 포함하는 케이스
    const encoded = encodeConfig(clockConfigSchema, { mode: 'analog' })
    const roundTripped = new URLSearchParams(`c=${encoded}`).get('c')
    const result = decodeConfig(clockConfigSchema, roundTripped)
    expect(result.ok).toBe(true)
    expect(result.value.mode).toBe('analog')
  })
})

describe('발급 측은 엄격 (발급 차단)', () => {
  it('스키마 불일치 입력이면 throw', () => {
    expect(() =>
      encodeConfig(clockConfigSchema, { mode: 'nope' } as never),
    ).toThrow()
  })
})

describe('렌더 측 폴백 (빈 화면 금지)', () => {
  const defaults = clockConfigSchema.parse({})

  it('c 없음 → empty + 기본 설정', () => {
    for (const raw of [null, undefined, '']) {
      const result = decodeConfig(clockConfigSchema, raw)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('empty')
      expect(result.value).toEqual(defaults)
    }
  })

  it('변조 문자열 → malformed + 기본 설정', () => {
    const result = decodeConfig(clockConfigSchema, '!!!not-lz-string!!!')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('malformed')
    expect(result.value).toEqual(defaults)
  })

  it('타입 불일치 JSON → invalid + 기본 설정', () => {
    const looseSchema = z.object({ n: z.number().default(1) })
    const encoded = encodeConfig(looseSchema, { n: 5 })
    // clock 스키마에는 없는 형태지만 strip이 흡수하므로, 명시적 타입 위반으로 검사
    const badSchema = z.object({ mode: z.number().default(0) })
    const result = decodeConfig(badSchema, encodeConfig(clockConfigSchema, { mode: 'analog' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid')
    expect(decodeConfig(clockConfigSchema, encoded).ok).toBe(true) // 알 수 없는 키는 strip
  })

  it('알 수 없는 키는 strip되어 성공 (전방 호환)', () => {
    const withExtra = z.object({
      mode: z.enum(['digital', 'analog']).default('digital'),
      legacyField: z.string().default('old'),
    })
    const encoded = encodeConfig(withExtra, { mode: 'analog', legacyField: 'x' })
    const result = decodeConfig(clockConfigSchema, encoded)
    expect(result.ok).toBe(true)
    expect(result.value.mode).toBe('analog')
    expect('legacyField' in result.value).toBe(false)
  })
})

describe('전 위젯 스키마 공통 규약', () => {
  it('parse({})가 항상 성공한다 (전 필드 default 필수)', () => {
    for (const [name, schema] of Object.entries(allSchemas)) {
      expect(() => schema.parse({}), `${name} 스키마`).not.toThrow()
    }
  })
})
