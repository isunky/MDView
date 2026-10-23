import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  APP_LANGUAGE_STORAGE_KEY,
  detectSystemLanguage,
  getLanguageLocale,
  getLoadedTranslation,
  loadAppLanguage,
  loadTranslation,
  saveAppLanguage,
  translations,
} from './i18n'

describe('interface languages', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each([
    ['ja-JP', 'ja'], ['ko-KR', 'ko'], ['es-MX', 'es'],
    ['es-ES', 'es'], ['zh-Hant-TW', 'zh'], ['JA_jp', 'ja'],
    ['en-GB', 'en'], ['fr-FR', 'en'],
  ] as const)('detects %s as %s', (tag, expected) => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue([tag])
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(tag)
    expect(detectSystemLanguage()).toBe(expected)
  })

  it('uses the first supported preference instead of any later Chinese preference', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'es-MX', 'zh-CN'])
    expect(detectSystemLanguage()).toBe('es')
  })

  it('falls back to navigator.language when the language list is empty', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue([])
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('ko-KR')
    expect(detectSystemLanguage()).toBe('ko')
  })

  it('uses English when there is no browser language information', () => {
    vi.stubGlobal('navigator', undefined)
    expect(detectSystemLanguage()).toBe('en')
  })

  it('restores a manual selection ahead of the system language', () => {
    saveAppLanguage('ja')
    expect(window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)).toBe('ja')
    expect(loadAppLanguage()).toBe('ja')
  })

  it('ignores an invalid saved language', () => {
    window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, 'invalid')
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ko-KR'])
    expect(loadAppLanguage()).toBe('ko')
  })

  it('keeps working when storage access fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked') })
    expect(loadAppLanguage()).toBe('en')
    expect(() => saveAppLanguage('es')).not.toThrow()
  })

  it.each([
    ['ja', 'ファイル'], ['ko', '파일'], ['es', 'Archivo'],
  ] as const)('loads and caches the %s catalog with the full syntax reference', async (language, fileMenu) => {
    const catalog = await loadTranslation(language)
    expect(catalog.fileMenu).toBe(fileMenu)
    expect(getLoadedTranslation(language)).toBe(catalog)
    expect(await loadTranslation(language)).toBe(catalog)
    expect(catalog.syntaxReferenceSections.map((section) => [section.id, section.items.map((item) => item.id)]))
      .toEqual(translations.en.syntaxReferenceSections.map((section) => [section.id, section.items.map((item) => item.id)]))
    expect(getLanguageLocale(language)).toBe(language)
  })
})
