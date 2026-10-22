import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { useState } from 'react'
import { useDialogFocus } from './useDialogFocus'

function Example({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useDialogFocus(open, () => { setOpen(false); onClose() })
  return <><button onClick={() => setOpen(true)}>Open</button>{open ? <div ref={ref} role="dialog"><button>First</button><button>Last</button></div> : null}</>
}

it('contains keyboard focus, blocks document shortcuts and restores the trigger', async () => {
  const user = userEvent.setup()
  const close = vi.fn()
  render(<Example onClose={close} />)
  const trigger = screen.getByRole('button', { name: 'Open' })
  await user.click(trigger)
  expect(trigger.inert).toBe(true)
  expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  const fileShortcut = new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, cancelable: true })
  window.dispatchEvent(fileShortcut)
  expect(fileShortcut.defaultPrevented).toBe(true)
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(close).toHaveBeenCalledOnce()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(trigger).toHaveFocus()
  expect(trigger.inert).not.toBe(true)
})
