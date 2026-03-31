import { useCallback, useEffect, useState } from 'react'
import type { AppSettings } from '../types'
import * as storage from '../services/storage'

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const s = await storage.loadSettings()
        if (cancelled) return
        setThemeState(s.theme)
        document.documentElement.classList.toggle('dark', s.theme === 'dark')
      } catch {
        if (!cancelled) {
          document.documentElement.classList.remove('dark')
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setTheme = useCallback(async (t: AppSettings['theme']) => {
    setThemeState(t)
    document.documentElement.classList.toggle('dark', t === 'dark')
    await storage.saveSettings({ theme: t })
  }, [])

  const toggle = useCallback(async () => {
    await setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  return { theme, setTheme, toggle, ready }
}
