import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DocumentOutline } from './DocumentOutline'
import { translations } from '../i18n'

describe('DocumentOutline', () => {
  it('marks the active heading for visual and accessibility state', () => {
    render(
      <DocumentOutline
        items={[
          { id: 'intro', level: 1, text: 'Intro' },
          { id: 'details', level: 2, text: 'Details' },
        ]}
        activeId="details"
        onJump={vi.fn()}
        onClose={vi.fn()}
        t={translations.en}
      />,
    )

    const inactiveHeading = screen.getByRole('button', { name: 'Jump to Intro' })
    const activeHeading = screen.getByRole('button', { name: 'Jump to Details' })

    expect(inactiveHeading).not.toHaveClass('active')
    expect(inactiveHeading).not.toHaveAttribute('aria-current')
    expect(activeHeading).toHaveClass('active')
    expect(activeHeading).toHaveAttribute('aria-current', 'location')
  })
})
