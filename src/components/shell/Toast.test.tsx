import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Toast } from './Toast'

describe('Toast', () => {
  it('renders an app toast as a status element', () => {
    render(
      <Toast label="Notification" placement="app" showPreviewLayer={false}>
        Saved
      </Toast>,
    )

    const toast = screen.getByRole('status', { name: 'Notification' })
    expect(toast).toHaveTextContent('Saved')
    expect(toast).toHaveClass('toast')
    expect(toast).toHaveClass('toast--app')
    expect(toast.parentElement).not.toHaveClass('toast-layer')
  })

  it('renders a preview toast inside the preview layer', () => {
    render(
      <Toast label="Notification" placement="preview" showPreviewLayer>
        110%
      </Toast>,
    )

    const toast = screen.getByRole('status', { name: 'Notification' })
    expect(toast).toHaveTextContent('110%')
    expect(toast).toHaveClass('toast')
    expect(toast).not.toHaveClass('toast--app')
    expect(toast.parentElement).toHaveClass('toast-layer')
  })

  it('hides a preview toast when the preview layer is not shown', () => {
    render(
      <Toast label="Notification" placement="preview" showPreviewLayer={false}>
        110%
      </Toast>,
    )

    expect(screen.queryByRole('status', { name: 'Notification' })).not.toBeInTheDocument()
  })
})
