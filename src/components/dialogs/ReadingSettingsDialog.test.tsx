import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_READING_PREFERENCES } from '../../domain/readingPreferences'
import { translations } from '../../i18n'
import { ReadingSettingsDialog } from './ReadingSettingsDialog'

const { listSystemFontFamilies } = vi.hoisted(() => ({
  listSystemFontFamilies: vi.fn(async () => ['Aptos', 'Microsoft YaHei', 'Segoe UI']),
}))

vi.mock('../../platform/systemFonts', () => ({
  systemFontAccess: {
    supportsSystemFonts: true,
    listSystemFontFamilies,
  },
}))

describe('ReadingSettingsDialog', () => {
  it('offers five color themes and applies the selection', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<ReadingSettingsDialog open preferences={DEFAULT_READING_PREFERENCES} onClose={vi.fn()}
      onReset={vi.fn()} onUpdate={onUpdate} t={translations.en} />)
    expect(screen.getByRole('button', { name: 'Jade' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Ocean' }))
    expect(onUpdate).toHaveBeenCalledWith({ colorScheme: 'ocean' })
  })
  it('adjusts reading preferences in small steps and updates their accessible values', async () => {
    const user = userEvent.setup()
    function Settings() {
      const [preferences, setPreferences] = useState(DEFAULT_READING_PREFERENCES)
      return <ReadingSettingsDialog open preferences={preferences} onClose={vi.fn()} onReset={vi.fn()}
        onUpdate={(changes) => setPreferences((current) => ({ ...current, ...changes }))} t={translations.en} />
    }
    render(<Settings />)

    await user.click(screen.getByRole('button', { name: 'Increase: Font size 16px' }))
    expect(screen.getByRole('slider', { name: 'Font size 17px' })).toHaveValue('17')
    await user.click(screen.getByRole('button', { name: 'Decrease: Font size 17px' }))
    expect(screen.getByRole('slider', { name: 'Font size 16px' })).toHaveValue('16')
    await user.click(screen.getByRole('button', { name: 'Increase: Line height 1.80' }))
    expect(screen.getByRole('slider', { name: 'Line height 1.85' })).toHaveAttribute('aria-valuetext', 'Line height 1.85')
    await user.click(screen.getByRole('button', { name: 'Increase: Content width 80%' }))
    expect(screen.getByRole('slider', { name: 'Content width 85%' })).toHaveValue('85')
  })

  it.each([
    { fontSize: 10, lineHeight: 1, contentWidth: 40, action: 'Decrease' },
    { fontSize: 24, lineHeight: 2.5, contentWidth: 100, action: 'Increase' },
  ])('disables adjustments at the $action limit', ({ action, ...values }) => {
    render(<ReadingSettingsDialog open preferences={{ ...DEFAULT_READING_PREFERENCES, ...values }}
      onClose={vi.fn()} onReset={vi.fn()} onUpdate={vi.fn()} t={translations.en} />)
    expect(screen.getByRole('button', { name: `${action}: ${translations.en.fontSize(values.fontSize)}` })).toBeDisabled()
    expect(screen.getByRole('button', { name: `${action}: ${translations.en.lineHeight(values.lineHeight)}` })).toBeDisabled()
    expect(screen.getByRole('button', { name: `${action}: ${translations.en.contentWidth(values.contentWidth)}` })).toBeDisabled()
  })

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
