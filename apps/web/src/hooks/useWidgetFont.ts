import { useMemo } from 'react'
import { ensureFontLoaded } from '../lib/widgetFonts'

/**
 * 위젯 font 설정 → CSS font-family 스타일.
 * 선택한 폰트만 온디맨드 로드하고, 로드 완료 시 브라우저가 자동 리페인트한다.
 */
export function useWidgetFont(
  fontId: string,
): { fontFamily: string } | undefined {
  return useMemo(() => {
    if (fontId === 'default') return undefined
    const family = ensureFontLoaded(fontId)
    return family ? { fontFamily: `'${family}', var(--font)` } : undefined
  }, [fontId])
}
