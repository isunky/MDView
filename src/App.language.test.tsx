import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { APP_LANGUAGE_STORAGE_KEY, loadTranslation } from './i18n'
import { tauriFileAccess } from './platform/fileAccess'

describe('App language selection', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('keeps the current unsaved document while a new language pack loads', async () => {
    const user = userEvent.setup()
    render(<App fileAccess={tauriFileAccess} initialLanguage="en" />)
    await user.click(screen.getByRole('button', { name: 'Create new markdown file' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Markdown source' }), {
      target: { value: '# Keep this draft' },
    })
    await user.click(screen.getByRole('button', { name: 'App' }))
    await act(async () => {
      await user.click(screen.getByRole('menuitem', { name: '日本語' }))
      await loadTranslation('ja')
    })
    expect(await screen.findByRole('textbox', { name: 'Markdown ソース' })).toHaveValue('# Keep this draft')
  })

  it.each([
    ['ja', '日本語'], ['ko', '한국어'], ['es', 'Español'],
  ] as const)('switches to %s and restores the manual selection on the next launch', async (language, name) => {
    const user = userEvent.setup()
    const { unmount } = render(<App fileAccess={tauriFileAccess} initialLanguage="en" />)
    await user.click(screen.getByRole('button', { name: 'App' }))
    await act(async () => {
      await user.click(screen.getByRole('menuitem', { name }))
      await loadTranslation(language)
    })
    const t = await loadTranslation(language)
    expect(await screen.findByRole('button', { name: t.fileMenu }, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: t.welcomeTitle })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe(language)
    expect(window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)).toBe(language)

    unmount()
    render(<App fileAccess={tauriFileAccess} />)
    expect(await screen.findByRole('button', { name: t.fileMenu })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: t.appMenu }))
    expect(screen.getByRole('menuitem', { name })).toHaveAttribute('aria-current', 'true')
  })

})
