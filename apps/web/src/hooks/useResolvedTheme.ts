import { useEffect, useState } from 'react'

type ThemeSetting = 'auto' | 'light' | 'dark'

/**
 * 위젯 theme 설정을 실제 라이트/다크로 해석한다.
 * auto는 prefers-color-scheme를 구독한다. (.dark 클래스 단일 소스)
 */
export function useResolvedTheme(setting: ThemeSetting): 'light' | 'dark' {
  const [system, setSystem] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  )

  useEffect(() => {
    if (setting !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) =>
      setSystem(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [setting])

  return setting === 'auto' ? system : setting
}
