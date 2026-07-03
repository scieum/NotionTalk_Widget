import { z } from 'zod'
import { accentField, bgField, fitField, themeField } from './common'

export const pomodoroConfigSchema = z.object({
  /** 집중 길이 (분) */
  focusMin: z.number().int().min(1).max(180).default(25),
  /** 짧은 휴식 (분) */
  shortBreakMin: z.number().int().min(1).max(60).default(5),
  /** 긴 휴식 (분) */
  longBreakMin: z.number().int().min(1).max(120).default(15),
  /** 몇 번째 집중마다 긴 휴식인지 */
  cyclesPerLongBreak: z.number().int().min(1).max(12).default(4),
  /** 페이즈 종료 시 자동으로 다음 페이즈 시작 */
  autoContinue: z.boolean().default(false),
  /** 종료 알림음 */
  sound: z.boolean().default(true),
  /** 집중 완료를 Notion 기록 DB에 자동 append */
  notionSync: z.boolean().default(false),
  /** 기록 DB ID (비우면 서버 기본 DB) */
  dbId: z.string().max(40).regex(/^[0-9a-fA-F-]*$/).default(''),
  /**
   * 위젯 토큰 — OAuth 사용자의 임베드 기록 인증(sealed, 서버만 복호화 가능).
   * 비우면 서버 기본 토큰 모드.
   */
  wt: z.string().max(1000).regex(/^[\w.-]*$/).default(''),
  /** 기록 행의 분류(select) 값 */
  category: z.string().min(1).max(30).default('뽀모도로'),
  theme: themeField,
  accent: accentField,
  bg: bgField,
  fit: fitField,
})

export type PomodoroConfig = z.output<typeof pomodoroConfigSchema>
