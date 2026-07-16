import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_READING_PREFERENCES,
  loadReadingPreferences,
  normalizeReadingPreferences,
  resolveEffectiveReadingTheme,
  saveReadingPreferences,
  type EffectiveReadingTheme,
  type ReadingPreferences,
} from '../domain/readingPreferences'
import {
  applyReadingTheme,
  getSystemReadingTheme,
  syncNativeAppTheme,
} from '../platform/readingTheme'

export function useReadingPreferences() {
  const [preferences, setPreferences] = useState<ReadingPreferences>(loadReadingPreferences)
  const [systemTheme, setSystemTheme] = useState<EffectiveReadingTheme>(getSystemReadingTheme)
  const effectiveTheme = resolveEffectiveReadingTheme(preferences.themeMode, systemTheme)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : 'light')
    mediaQuery.addEventListener?.('change', handleChange)
    return () => mediaQuery.removeEventListener?.('change', handleChange)
  }, [])

  useEffect(() => {
    applyReadingTheme(preferences, effectiveTheme)
    saveReadingPreferences(preferences)
    void syncNativeAppTheme(effectiveTheme)
  }, [effectiveTheme, preferences])

  const updatePreferences = useCallback((changes: Partial<ReadingPreferences>) => {
    setPreferences((current) => normalizeReadingPreferences({ ...current, ...changes }))
  }, [])

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_READING_PREFERENCES)
  }, [])

  return {
    effectiveTheme,
    preferences,
    resetPreferences,
    updatePreferences,
  }
}
