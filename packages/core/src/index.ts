export {
  encodeConfig,
  decodeConfig,
  type DecodeResult,
  type DecodeFailReason,
} from './codec'

export { hashSeed, mulberry32, seededShuffle } from './prng'

export {
  createIdle,
  start,
  pause,
  reset,
  remaining,
  tick,
  type PomodoroState,
  type PomodoroPhase,
  type PomodoroDurations,
  type PhaseCompleted,
} from './pomodoro'

export {
  assignSeats,
  type SeatConstraints,
  type SeatResult,
  type SeatFailReason,
} from './seat'

export { drawStudents, type DrawResult } from './draw'

export {
  generateLadder,
  traceLadder,
  type LadderSpec,
  type LadderTrace,
} from './ladder'

export {
  aggregateRecords,
  type StudyRow,
  type Tally,
  type RecordStats,
} from './aggregate'

export {
  themeField,
  accentField,
  bgField,
  ACCENT_CSS_VAR,
  fitField,
  type Accent,
  type PastelBg,
  type CardFit,
} from './schemas/common'
export { clockConfigSchema, type ClockConfig } from './schemas/clock'
export { calendarConfigSchema, type CalendarConfig } from './schemas/calendar'
export { pomodoroConfigSchema, type PomodoroConfig } from './schemas/pomodoro'
export {
  classTimerConfigSchema,
  type ClassTimerConfig,
} from './schemas/classTimer'
export {
  seatPickerConfigSchema,
  type SeatPickerConfig,
} from './schemas/seatPicker'
export {
  randomPickerConfigSchema,
  type RandomPickerConfig,
} from './schemas/randomPicker'
export { weatherConfigSchema, type WeatherConfig } from './schemas/weather'
export { diceConfigSchema, type DiceConfig } from './schemas/dice'
export { ladderConfigSchema, type LadderConfig } from './schemas/ladder'
export { mapConfigSchema, type MapConfig } from './schemas/map'
export { tabsConfigSchema, type TabsConfig } from './schemas/tabs'
export { todoConfigSchema, type TodoConfig } from './schemas/todo'
export {
  flipClockConfigSchema,
  type FlipClockConfig,
} from './schemas/flipClock'
export {
  whiteboardConfigSchema,
  type WhiteboardConfig,
} from './schemas/whiteboard'
export { galleryConfigSchema, type GalleryConfig } from './schemas/gallery'
