import {
  calendarConfigSchema,
  classTimerConfigSchema,
  clockConfigSchema,
  pomodoroConfigSchema,
  randomPickerConfigSchema,
  seatPickerConfigSchema,
} from '@nwh/core'
import CalendarSettings from './calendar/CalendarSettings'
import CalendarWidget from './calendar/CalendarWidget'
import ClassTimerSettings from './classTimer/ClassTimerSettings'
import ClassTimerWidget from './classTimer/ClassTimerWidget'
import ClockSettings from './clock/ClockSettings'
import ClockWidget from './clock/ClockWidget'
import PomodoroSettings from './pomodoro/PomodoroSettings'
import PomodoroWidget from './pomodoro/PomodoroWidget'
import RandomPickerSettings from './randomPicker/RandomPickerSettings'
import RandomPickerWidget from './randomPicker/RandomPickerWidget'
import SeatPickerSettings from './seatPicker/SeatPickerSettings'
import SeatPickerWidget from './seatPicker/SeatPickerWidget'
import {
  CalendarThumb,
  ClassTimerThumb,
  ClockThumb,
  PomodoroThumb,
  RandomThumb,
  SeatThumb,
} from './thumbs'
import type { WidgetDef } from './types'

/**
 * 위젯 레지스트리 — /w/:widget, /f/:widget의 :widget이 여기 키와 일치해야 한다.
 * 새 위젯 추가 = core에 스키마 + 여기 항목 하나(컴포넌트 + 설정 폼).
 */
export const registry: Record<string, WidgetDef> = {
  clock: {
    id: 'clock',
    name: '시계',
    description: '아날로그/디지털 시계 — 12/24시간제, 날짜 표시, 파스텔 카드 배경',
    category: 'personal',
    signatureBg: 'mint',
    embedAspect: (config) =>
      (config as { mode?: string }).mode === 'analog' ? 1 : undefined,
    schema: clockConfigSchema,
    Component: ClockWidget as WidgetDef['Component'],
    SettingsForm: ClockSettings as WidgetDef['SettingsForm'],
    Thumb: ClockThumb,
  },
  calendar: {
    id: 'calendar',
    name: '캘린더',
    description: '월간 달력 — 오늘 강조, 주 시작 요일 설정, 이전/다음 달 이동',
    category: 'personal',
    signatureBg: 'purple',
    embedAspect: () => 1.05, // 달력 격자 핏
    schema: calendarConfigSchema,
    Component: CalendarWidget as WidgetDef['Component'],
    SettingsForm: CalendarSettings as WidgetDef['SettingsForm'],
    Thumb: CalendarThumb,
  },
  pomodoro: {
    id: 'pomodoro',
    name: '뽀모도로',
    description: '집중/휴식 타이머 — 자동 반복, 알림음, 오늘 누적 기록',
    category: 'personal',
    signatureBg: 'pink',
    embedAspect: () => 1, // 다이얼 중심 — 정사각 핏
    schema: pomodoroConfigSchema,
    Component: PomodoroWidget as WidgetDef['Component'],
    SettingsForm: PomodoroSettings as WidgetDef['SettingsForm'],
    Thumb: PomodoroThumb,
  },
  'class-timer': {
    id: 'class-timer',
    name: '수업 타이머',
    description: '카운트다운 — 프리셋/직접 입력, 종료 알림음·화면 플래시, 교실용 초대형 숫자',
    category: 'classroom',
    signatureBg: 'sand',
    schema: classTimerConfigSchema,
    Component: ClassTimerWidget as WidgetDef['Component'],
    SettingsForm: ClassTimerSettings as WidgetDef['SettingsForm'],
    Thumb: ClassTimerThumb,
  },
  'seat-picker': {
    id: 'seat-picker',
    name: '자리뽑기',
    description: '교실 격자 자리 배정 — 고정석·떨어뜨리기 조건, 순차 공개, 이전 배치 보기',
    category: 'classroom',
    signatureBg: 'green',
    schema: seatPickerConfigSchema,
    Component: SeatPickerWidget as WidgetDef['Component'],
    SettingsForm: SeatPickerSettings as WidgetDef['SettingsForm'],
    Thumb: SeatThumb,
  },
  'random-picker': {
    id: 'random-picker',
    name: '랜덤뽑기',
    description: '명단에서 N명 추첨 — 중복 제외/허용, 뽑힌 학생 표시, 룰렛 연출',
    category: 'classroom',
    signatureBg: 'blue',
    schema: randomPickerConfigSchema,
    Component: RandomPickerWidget as WidgetDef['Component'],
    SettingsForm: RandomPickerSettings as WidgetDef['SettingsForm'],
    Thumb: RandomThumb,
  },
}
