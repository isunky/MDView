import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
        maxDepth={3}
        onJump={vi.fn()}
        onMaxDepthChange={vi.fn()}
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
    expect(screen.queryByText('2 headings')).not.toBeInTheDocument()
  })

  it('changes the maximum outline depth from the header icon', async () => {
    const user = userEvent.setup()
    const onMaxDepthChange = vi.fn()
    render(
      <DocumentOutline
        items={[]}
        maxDepth={3}
        onJump={vi.fn()}
        onMaxDepthChange={onMaxDepthChange}
        onClose={vi.fn()}
        t={translations.en}
      />,
    )

    await user.click(screen.getByLabelText('Set outline depth'))
    expect(screen.getByRole('button', { name: 'Show through heading level 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Show through heading level 4' }))

    expect(onMaxDepthChange).toHaveBeenCalledWith(4)
  })
})
