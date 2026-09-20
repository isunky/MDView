import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_READING_PREFERENCES } from '../domain/readingPreferences'
import { translations } from '../i18n'
import { ReadingSettingsDialog } from './ReadingSettingsDialog'

const { listSystemFontFamilies } = vi.hoisted(() => ({
  listSystemFontFamilies: vi.fn(async () => ['Aptos', 'Microsoft YaHei', 'Segoe UI']),
}))

vi.mock('../platform/systemFonts', () => ({
  systemFontAccess: {
    supportsSystemFonts: true,
    listSystemFontFamilies,
  },
}))

describe('ReadingSettingsDialog', () => {
  it('loads and selects an installed reading font', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()

    render(
      <ReadingSettingsDialog
        open
        preferences={DEFAULT_READING_PREFERENCES}
        onClose={vi.fn()}
        onReset={vi.fn()}
        onUpdate={onUpdate}
        t={translations.en}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Installed font' }))

    await waitFor(() => expect(listSystemFontFamilies).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('option', { name: /Aptos/ })).toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: /Aptos/ }))

    expect(onUpdate).toHaveBeenCalledWith({
      fontFamily: 'custom',
      customFontFamily: 'Aptos',
    })
  })
})
