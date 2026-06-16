import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { appInfo } from './appInfo'
import type { FileAccess, OpenedMarkdownFile } from './platform/fileAccess'

describe('App', () => {
  it('loads a markdown file passed by the desktop shell at startup', async () => {
    renderApp({ fileAccess: createFileAccess({ startupFile: file('/tmp/start.md', '# Startup') }) })

    expect(await screen.findByRole('heading', { name: 'Startup' })).toBeInTheDocument()
    expect(screen.getByText('start.md')).toBeInTheDocument()
  })

  it('opens a markdown file from the toolbar', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess({ openFile: file('/tmp/readme.md', '# Readme') }) })

    await user.click(screen.getByRole('button', { name: 'Open markdown file' }))

    expect(await screen.findByRole('heading', { name: 'Readme' })).toBeInTheDocument()
    expect(screen.getByText('readme.md')).toBeInTheDocument()
  })

  it('marks edits as unsaved and saves the current file path', async () => {
    const user = userEvent.setup()
    const saveMarkdownFile = vi.fn(async (path: string) => path)
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/draft.md', '# Draft'),
        saveMarkdownFile,
      }),
    })

    await screen.findByRole('heading', { name: 'Draft' })
    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))
    await user.clear(screen.getByRole('textbox', { name: 'Markdown source' }))
    await user.type(screen.getByRole('textbox', { name: 'Markdown source' }), '# Changed')

    expect(screen.getByText('Unsaved')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save markdown file' }))

    await waitFor(() => {
      expect(saveMarkdownFile).toHaveBeenCalledWith('/tmp/draft.md', '# Changed')
    })
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('returns to saved state when edits match the saved content again', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess({ startupFile: file('/tmp/draft.md', '# Draft') }) })

    await screen.findByRole('heading', { name: 'Draft' })
    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))
    await user.clear(screen.getByRole('textbox', { name: 'Markdown source' }))

    expect(screen.getByText('Unsaved')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Markdown source' }), '# Draft')

    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('opens and closes the About dialog with version and author details', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess() })

    await user.click(screen.getByRole('button', { name: 'Open about dialog' }))

    const dialog = screen.getByRole('dialog', { name: 'About MDView' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(`Version ${appInfo.version}`)).toBeInTheDocument()
    expect(screen.getByText('Sunky')).toBeInTheDocument()
    expect(screen.queryByText('Author Sunky')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'www.sunky.net' })).toHaveAttribute(
      'href',
      'https://www.sunky.net',
    )

    await user.click(screen.getByRole('button', { name: 'Close about dialog' }))

    expect(screen.queryByRole('dialog', { name: 'About MDView' })).not.toBeInTheDocument()
  })

  it('shows a clickable outline in preview mode only', async () => {
    const user = userEvent.setup()
    const scrollIntoView = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file(
          '/tmp/outline.md',
          ['# Project Plan', '', '## Scope', '', '### Details'].join('\n'),
        ),
      }),
    })

    expect(await screen.findByRole('navigation', { name: 'Document outline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jump to Project Plan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jump to Scope' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Jump to Scope' }))

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })

    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))

    expect(screen.queryByRole('navigation', { name: 'Document outline' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Split preview and source' }))

    expect(screen.queryByRole('navigation', { name: 'Document outline' })).not.toBeInTheDocument()
  })

  it('collapses and reopens the outline in preview mode', async () => {
    const user = userEvent.setup()
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/outline.md', '# Project Plan\n\n## Scope'),
      }),
    })

    expect(await screen.findByRole('navigation', { name: 'Document outline' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse document outline' }))

    expect(screen.queryByRole('navigation', { name: 'Document outline' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand document outline' }))

    expect(screen.getByRole('navigation', { name: 'Document outline' })).toBeInTheDocument()
  })

  it('resizes the outline with the preview separator', async () => {
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/outline.md', '# Project Plan\n\n## Scope'),
      }),
    })

    const separator = await screen.findByRole('separator', { name: 'Resize document outline' })
    expect(separator).toHaveAttribute('aria-valuenow', '260')

    fireEvent.pointerDown(separator, { clientX: 260 })
    fireEvent.pointerMove(window, { clientX: 340 })
    fireEvent.pointerUp(window)

    await waitFor(() => {
      expect(separator).toHaveAttribute('aria-valuenow', '340')
      expect(screen.getByLabelText('Outline panel')).toHaveStyle({ width: '340px' })
    })
  })

  it('uses Chinese interface text when the system language is Chinese and can switch languages', async () => {
    const user = userEvent.setup()
    render(<App fileAccess={createFileAccess()} initialLanguage="zh" />)

    expect(screen.getByRole('button', { name: '新建 Markdown 文件' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '预览 Markdown' })).toBeInTheDocument()
    expect(screen.getByText('已保存')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('界面语言'), 'en')

    expect(screen.getByRole('button', { name: 'Create new markdown file' })).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })
})

function renderApp(props: ComponentProps<typeof App>) {
  return render(<App {...props} initialLanguage={props.initialLanguage ?? 'en'} />)
}

function file(path: string, content: string): OpenedMarkdownFile {
  return { path, content }
}

function createFileAccess(
  overrides: {
    startupFile?: OpenedMarkdownFile | null
    openFile?: OpenedMarkdownFile | null
    saveMarkdownFile?: FileAccess['saveMarkdownFile']
  } = {},
): FileAccess {
  return {
    supportsNativeFiles: true,
    openMarkdownFile: vi.fn(async () => overrides.openFile ?? null),
    saveMarkdownFile: overrides.saveMarkdownFile ?? vi.fn(async (path) => path),
    saveMarkdownFileAs: vi.fn(async () => '/tmp/saved-as.md'),
    readStartupMarkdownFile: vi.fn(async () => overrides.startupFile ?? null),
    listenForOpenedFiles: vi.fn(async () => null),
  }
}
