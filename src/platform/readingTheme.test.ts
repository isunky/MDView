import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_READING_PREFERENCES } from '../domain/readingPreferences'
import { applyReadingTheme, bootstrapReadingTheme, getSystemReadingTheme } from './readingTheme'

describe('readingTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-mdview-color-theme')
    document.documentElement.removeAttribute('data-mdview-font-family')
    document.documentElement.style.cssText = ''
    vi.unstubAllGlobals()
  })

  it('applies the selected color and reading layout to the document root', () => {
    applyReadingTheme({ ...DEFAULT_READING_PREFERENCES, fontFamily: 'serif', fontSize: 18, lineHeight: 2, contentWidth: 1040 }, 'dark')

    expect(document.documentElement.dataset.mdviewColorTheme).toBe('dark')
    expect(document.documentElement.dataset.mdviewFontFamily).toBe('serif')
    expect(document.documentElement.style.getPropertyValue('--reader-font-size')).toBe('18px')
    expect(document.documentElement.style.getPropertyValue('--reader-line-height')).toBe('2')
    expect(document.documentElement.style.getPropertyValue('--reader-content-width')).toBe('1040px')
  })

  it('uses the system color preference while bootstrapping', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))

    bootstrapReadingTheme(() => DEFAULT_READING_PREFERENCES, (preferences, systemTheme) => {
      expect(preferences).toEqual(DEFAULT_READING_PREFERENCES)
      return systemTheme
    })

    expect(getSystemReadingTheme()).toBe('dark')
    expect(document.documentElement.dataset.mdviewColorTheme).toBe('dark')
  })
})
