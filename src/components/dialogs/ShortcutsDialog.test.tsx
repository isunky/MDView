import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SHORTCUT_IDS, ShortcutSettingsProvider } from '../../platform/shortcutSettings'
import ShortcutsDialog from './ShortcutsDialog'

describe('shortcut settings dialog', () => {
  beforeEach(() => localStorage.clear())

  it.each(['zh', 'zh-TW', 'en', 'ja', 'ko', 'es'] as const)('lists every shortcut with an accessible label in %s', (language) => {
    render(<ShortcutSettingsProvider><ShortcutsDialog language={language} onClose={vi.fn()} /></ShortcutSettingsProvider>)
    const switches = screen.getAllByRole('checkbox')
    expect(switches).toHaveLength(SHORTCUT_IDS.length)
    for (const checkbox of switches) expect(checkbox).toHaveAccessibleName()
    expect(new Set(switches.map((checkbox) => checkbox.getAttribute('aria-label'))).size).toBe(SHORTCUT_IDS.length)
  })
})
