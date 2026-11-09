import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { tauriFileAccess } from './platform/fileAccess'

describe('shortcut settings', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(navigator, 'platform', { configurable: true, value: 'Win32' })
  })

  it('opens above About, disables all, enables one, and persists the selection', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App fileAccess={tauriFileAccess} initialLanguage="en" />)
    await user.click(screen.getByRole('button', { name: /^App$/ }))
    const items = screen.getAllByRole('menuitem').map((item) => item.textContent)
    expect(items.indexOf('Keyboard shortcuts')).toBe(items.indexOf('About') - 1)
    await user.click(screen.getByRole('menuitem', { name: 'Keyboard shortcuts' }))
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(31)
    await user.click(within(dialog).getByRole('button', { name: 'Disable all' }))
    expect(within(dialog).getByRole('checkbox', { name: /^Bold$/ })).not.toBeChecked()
    await user.click(within(dialog).getByRole('checkbox', { name: /^Bold$/ }))
    expect(within(dialog).getByRole('checkbox', { name: /^Bold$/ })).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Close keyboard shortcuts' }))
    await user.click(screen.getByRole('button', { name: 'Create new markdown file' }))
    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    fireEvent.change(editor, { target: { value: 'hello' } })
    editor.setSelectionRange(0, 5)
    fireEvent.keyDown(editor, { key: 'i', ctrlKey: true })
    expect(editor).toHaveValue('hello')
    fireEvent.keyDown(editor, { key: 'b', ctrlKey: true })
    expect(editor).toHaveValue('**hello**')
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    expect(screen.queryByRole('textbox', { name: 'Find' })).not.toBeInTheDocument()
    unmount()

    render(<App fileAccess={tauriFileAccess} initialLanguage="en" />)
    await user.click(screen.getByRole('button', { name: /^App$/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Keyboard shortcuts' }))
    const reopened = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(within(reopened).getByRole('checkbox', { name: /^Bold$/ })).toBeChecked()
    expect(within(reopened).getByRole('checkbox', { name: /^Italic$/ })).not.toBeChecked()
    await user.click(within(reopened).getByRole('button', { name: 'Enable all' }))
    expect(within(reopened).getByRole('checkbox', { name: /^Italic$/ })).toBeChecked()
  })

  it('leaves menu actions available and respects disabled file and editor keys', async () => {
    localStorage.setItem('mdview.disabledShortcuts.v1', JSON.stringify(['new', 'tableNext', 'listContinue']))
    const user = userEvent.setup()
    render(<App fileAccess={tauriFileAccess} initialLanguage="en" />)
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    expect(screen.getByRole('button', { name: 'Create new markdown file' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create new markdown file' }))
    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    fireEvent.change(editor, { target: { value: '- item' } })
    editor.setSelectionRange(6, 6)
    expect(fireEvent.keyDown(editor, { key: 'Enter' })).toBe(true)
    expect(editor).toHaveValue('- item')
    fireEvent.change(editor, { target: { value: '| A | B |\n| --- | --- |' } })
    editor.setSelectionRange(2, 3)
    expect(fireEvent.keyDown(editor, { key: 'Tab' })).toBe(true)
    expect(editor).toHaveValue('| A | B |\n| --- | --- |')
  })
})
