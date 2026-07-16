import { setTheme } from '@tauri-apps/api/app'
import type { EffectiveReadingTheme, ReadingPreferences } from '../domain/readingPreferences'

export function getSystemReadingTheme(): EffectiveReadingTheme {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function applyReadingTheme(
  preferences: ReadingPreferences,
  effectiveTheme: EffectiveReadingTheme,
) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.dataset.mdviewColorTheme = effectiveTheme
  root.dataset.mdviewFontFamily = preferences.fontFamily
  root.style.setProperty('--reader-font-size', `${preferences.fontSize}px`)
  root.style.setProperty('--reader-line-height', String(preferences.lineHeight))
  root.style.setProperty('--reader-content-width', `${preferences.contentWidth}px`)
}

export function bootstrapReadingTheme(loadPreferences: () => ReadingPreferences, resolveTheme: (preferences: ReadingPreferences, systemTheme: EffectiveReadingTheme) => EffectiveReadingTheme) {
  const preferences = loadPreferences()
  applyReadingTheme(preferences, resolveTheme(preferences, getSystemReadingTheme()))
}

export async function syncNativeAppTheme(theme: EffectiveReadingTheme) {
  if (!isTauriRuntime()) {
    return
  }

  try {
    await setTheme(theme)
  } catch {
    // Browser previews and older desktop runtimes can safely keep their native default.
  }
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
