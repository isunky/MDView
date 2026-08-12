import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { FileAccess, MarkdownFileCheck, MarkdownFileWatchEvent } from './platform/fileAccess'

describe('external file changes', () => {
  beforeEach(() => window.localStorage.clear())

  it('reloads a clean document after a native watch event', async () => {
    const user = userEvent.setup()
    const harness = createFileAccessHarness()
    render(<App fileAccess={harness.fileAccess} initialLanguage="en" />)
    expect(await screen.findByText('readme.md')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))
    expect(screen.getByRole('textbox', { name: 'Markdown source' })).toHaveValue('# Original')
    await waitFor(() => expect(harness.notify).toBeTypeOf('function'))

    harness.check.mockResolvedValueOnce(changed('# Updated outside', 'external'))
    await act(async () => {
      harness.notify?.({ kind: 'changed', path: '/tmp/readme.md' })
      await new Promise((resolve) => window.setTimeout(resolve, 300))
    })

    expect(screen.getByRole('textbox', { name: 'Markdown source' })).toHaveValue('# Updated outside')
    expect(screen.getByText('Updated from disk')).toBeInTheDocument()
  })

  it('shows a conflict when the document has unsaved edits', async () => {
    const user = userEvent.setup()
    const harness = createFileAccessHarness()
    render(<App fileAccess={harness.fileAccess} initialLanguage="en" />)
    expect(await screen.findByText('readme.md')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Markdown source' }), {
      target: { value: '# Local edit' },
    })
    await waitFor(() => expect(harness.notify).toBeTypeOf('function'))

    harness.check.mockResolvedValueOnce(changed('# Updated outside', 'external'))
    await act(async () => {
      harness.notify?.({ kind: 'changed', path: '/tmp/readme.md' })
      await new Promise((resolve) => window.setTimeout(resolve, 300))
    })

    expect(screen.getByRole('button', { name: 'Reload disk version' })).toBeInTheDocument()
    expect(screen.getAllByText('This file changed on disk while you have unsaved edits.')).toHaveLength(2)
    expect(screen.getByRole('textbox', { name: 'Markdown source' })).toHaveValue('# Local edit')
  })
})

function createFileAccessHarness() {
  let notify: ((event: MarkdownFileWatchEvent) => void) | undefined
  const check = vi.fn<() => Promise<MarkdownFileCheck>>(async () => ({ status: 'unchanged' }))
  const fileAccess: FileAccess = {
    supportsNativeFiles: true,
    supportsImageImport: true,
    openMarkdownFile: vi.fn(async () => null),
    openMarkdownFileAtPath: vi.fn(),
    revealFileInFolder: vi.fn(),
    saveMarkdownFile: vi.fn(),
    saveMarkdownFileAs: vi.fn(),
    checkMarkdownFile: check,
    watchMarkdownFile: vi.fn(async (_path, callback) => {
      notify = callback
      return () => undefined
    }),
    exportHtmlFile: vi.fn(),
    exportDocxFile: vi.fn(),
    printExportHtml: vi.fn(),
    readLocalImageFile: vi.fn(),
    writeImageAsset: vi.fn(),
    readStartupMarkdownFile: vi.fn(async () => ({ path: '/tmp/readme.md', content: '# Original', revision: 'original' })),
    listenForOpenedFiles: vi.fn(async () => null),
  }
  return { fileAccess, check, get notify() { return notify } }
}

function changed(content: string, revision: string): MarkdownFileCheck {
  return { status: 'changed', file: { path: '/tmp/readme.md', content, revision } }
}
