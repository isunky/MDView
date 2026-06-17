import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { appInfo } from './appInfo'
import { RECENT_FILES_STORAGE_KEY, type RecentFile } from './domain/recentFiles'
import type { FileAccess, OpenedMarkdownFile } from './platform/fileAccess'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('loads a markdown file passed by the desktop shell at startup', async () => {
    renderApp({ fileAccess: createFileAccess({ startupFile: file('/tmp/start.md', '# Startup') }) })

    expect(await screen.findByRole('heading', { name: 'Startup' })).toBeInTheDocument()
    expect(screen.getByText('start.md')).toBeInTheDocument()
    await waitFor(() => {
      expect(getStoredRecentFiles().map((file) => file.path)).toEqual(['/tmp/start.md'])
    })
  })

  it('opens a markdown file from the toolbar', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess({ openFile: file('/tmp/readme.md', '# Readme') }) })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Open Markdown File' }))

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

    expect(screen.queryByRole('button', { name: 'Open about dialog' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Interface language')).not.toBeInTheDocument()

    await openLogoMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'About' }))

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

  it('opens a compact logo menu with about and language actions', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess() })

    await openLogoMenu(user)

    expect(screen.getByRole('menuitem', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByText('Interface language')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '中文' })).toBeInTheDocument()
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

  it('adds opened markdown files to the recent files menu', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess({ openFile: file('/tmp/readme.md', '# Readme') }) })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Open Markdown File' }))
    await openFileMenu(user)

    expect(screen.getByRole('menuitem', { name: 'readme.md' })).toHaveAttribute(
      'title',
      '/tmp/readme.md',
    )
    expect(getStoredRecentFiles().map((file) => file.path)).toEqual(['/tmp/readme.md'])
  })

  it('adds markdown files opened by the desktop shell listener to recent files', async () => {
    let openedFileCallback: ((file: OpenedMarkdownFile) => void) | null = null
    const listenForOpenedFiles = vi.fn(async (callback: (file: OpenedMarkdownFile) => void) => {
      openedFileCallback = callback
      return null
    })
    renderApp({ fileAccess: createFileAccess({ listenForOpenedFiles }) })

    await waitFor(() => {
      expect(openedFileCallback).not.toBeNull()
    })

    await act(async () => {
      openedFileCallback?.(file('/tmp/associated.md', '# Associated'))
    })

    expect(await screen.findByRole('heading', { name: 'Associated' })).toBeInTheDocument()
    await waitFor(() => {
      expect(getStoredRecentFiles().map((file) => file.path)).toEqual(['/tmp/associated.md'])
    })
  })

  it('shows file menu actions together', async () => {
    const user = userEvent.setup()
    seedRecentFiles([recent('/tmp/recent.md', '2026-01-01T00:00:00.000Z')])
    renderApp({ fileAccess: createFileAccess() })

    await openFileMenu(user)

    expect(screen.getByRole('menuitem', { name: 'Open Markdown File' })).toBeInTheDocument()
    expect(screen.getByText('Recent files')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'recent.md' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Export as HTML' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Export as PDF' })).toBeInTheDocument()
  })

  it('adds successful save-as paths to recent files', async () => {
    const user = userEvent.setup()
    renderApp({
      fileAccess: createFileAccess({
        saveMarkdownFileAs: vi.fn(async () => '/tmp/saved-as.md'),
      }),
    })

    await user.click(screen.getByRole('button', { name: 'Save markdown file as' }))
    await openFileMenu(user)

    expect(screen.getByRole('menuitem', { name: 'saved-as.md' })).toHaveAttribute(
      'title',
      '/tmp/saved-as.md',
    )
  })

  it('disables the file menu when native files are unavailable', () => {
    renderApp({ fileAccess: createFileAccess({ supportsNativeFiles: false }) })

    expect(screen.getByRole('button', { name: 'Open' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute(
      'title',
      'Native file dialogs are available after launching the desktop app.',
    )
  })

  it('uses Chinese interface text when the system language is Chinese and can switch languages', async () => {
    const user = userEvent.setup()
    render(<App fileAccess={createFileAccess()} initialLanguage="zh" />)

    expect(screen.getByRole('button', { name: '新建 Markdown 文件' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '预览 Markdown' })).toBeInTheDocument()
    expect(screen.getByText('已保存')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开应用菜单' }))

    expect(screen.getByRole('menuitem', { name: '关于' })).toBeInTheDocument()
    expect(screen.getByText('界面语言')).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'English' }))

    expect(screen.getByRole('button', { name: 'Create new markdown file' })).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('closes the logo menu with Escape and outside clicks', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess() })

    await openLogoMenu(user)
    expect(screen.getByRole('menuitem', { name: 'About' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menuitem', { name: 'About' })).not.toBeInTheDocument()

    await openLogoMenu(user)
    expect(screen.getByRole('menuitem', { name: 'About' })).toBeInTheDocument()

    await user.click(screen.getByText('Untitled.md'))
    expect(screen.queryByRole('menuitem', { name: 'About' })).not.toBeInTheDocument()
  })

  it('opens a recent file from the menu', async () => {
    const user = userEvent.setup()
    const openMarkdownFileAtPath = vi.fn(async (path: string) => file(path, '# Recent'))
    seedRecentFiles([recent('/tmp/recent.md', '2026-01-01T00:00:00.000Z')])
    renderApp({
      fileAccess: createFileAccess({ openMarkdownFileAtPath }),
    })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'recent.md' }))

    expect(openMarkdownFileAtPath).toHaveBeenCalledWith('/tmp/recent.md')
    expect(await screen.findByRole('heading', { name: 'Recent' })).toBeInTheDocument()
  })

  it('opens a linked markdown file from the preview relative to the current file', async () => {
    const user = userEvent.setup()
    const openMarkdownFileAtPath = vi.fn(async (path: string) => file(path, '# Linked'))
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/docs/readme.md', '[Linked](linked.md#linked)'),
        openMarkdownFileAtPath,
      }),
    })

    await user.click(await screen.findByRole('link', { name: 'Linked' }))

    expect(openMarkdownFileAtPath).toHaveBeenCalledWith('/tmp/docs/linked.md')
    expect(await screen.findByRole('heading', { name: 'Linked' })).toBeInTheDocument()
    expect(getStoredRecentFiles().map((file) => file.path)).toEqual([
      '/tmp/docs/linked.md',
      '/tmp/docs/readme.md',
    ])
  })

  it('removes a recent file when reopening it fails', async () => {
    const user = userEvent.setup()
    seedRecentFiles([recent('/tmp/missing.md', '2026-01-01T00:00:00.000Z')])
    renderApp({
      fileAccess: createFileAccess({
        openMarkdownFileAtPath: vi.fn(async () => {
          throw new Error('missing file')
        }),
      }),
    })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'missing.md' }))

    expect(screen.getByText('Recent file could not be opened and was removed.')).toBeInTheDocument()
    expect(getStoredRecentFiles()).toEqual([])
  })

  it('clears recent files from the menu and storage', async () => {
    const user = userEvent.setup()
    seedRecentFiles([recent('/tmp/recent.md', '2026-01-01T00:00:00.000Z')])
    renderApp({ fileAccess: createFileAccess() })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Clear recent files' }))

    await openFileMenu(user)

    expect(screen.getByText('No recent files')).toBeInTheDocument()
    expect(window.localStorage.getItem(RECENT_FILES_STORAGE_KEY)).toBeNull()
  })

  it('shows Chinese recent file labels and empty state', async () => {
    const user = userEvent.setup()
    render(<App fileAccess={createFileAccess()} initialLanguage="zh" />)

    await user.click(screen.getByRole('button', { name: '打开' }))

    expect(screen.getByText('没有最近文件')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '清空最近文件' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: '导出为 HTML' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '导出为 PDF' })).toBeInTheDocument()
  })

  it('exports the current preview as self-contained HTML', async () => {
    const user = userEvent.setup()
    const exportHtmlFile = vi.fn<FileAccess['exportHtmlFile']>(async () => '/tmp/report.html')
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file(
          '/tmp/report.md',
          ['# Exported', '', '| Key | Value |', '| --- | --- |', '| OS | Windows |', '', '```ts', 'const ready = true', '```'].join('\n'),
        ),
        exportHtmlFile,
      }),
    })

    expect(await screen.findByRole('heading', { name: 'Exported' })).toBeInTheDocument()

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Export as HTML' }))

    await waitFor(() => {
      expect(exportHtmlFile).toHaveBeenCalledTimes(1)
    })
    const [html, currentPath, title] = exportHtmlFile.mock.calls[0]
    expect(currentPath).toBe('/tmp/report.md')
    expect(title).toBe('report.md')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<h1 id="exported">Exported</h1>')
    expect(html).toContain('<table>')
    expect(html).toContain('ready =')
    expect(screen.getByText('HTML exported')).toBeInTheDocument()
  })

  it('shows export canceled when HTML export is canceled', async () => {
    const user = userEvent.setup()
    renderApp({
      fileAccess: createFileAccess({
        exportHtmlFile: vi.fn(async () => null),
      }),
    })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Export as HTML' }))

    expect(await screen.findByText('Export canceled')).toBeInTheDocument()
  })

  it('shows export errors when HTML export fails', async () => {
    const user = userEvent.setup()
    renderApp({
      fileAccess: createFileAccess({
        exportHtmlFile: vi.fn(async () => {
          throw new Error('export failed')
        }),
      }),
    })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Export as HTML' }))

    expect(await screen.findByText('export failed')).toBeInTheDocument()
  })

  it('opens the print dialog for PDF export', async () => {
    const user = userEvent.setup()
    const printExportHtml = vi.fn<FileAccess['printExportHtml']>(async () => undefined)
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/print.md', '# Printable'),
        printExportHtml,
      }),
    })

    expect(await screen.findByRole('heading', { name: 'Printable' })).toBeInTheDocument()

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Export as PDF' }))

    await waitFor(() => {
      expect(printExportHtml).toHaveBeenCalledTimes(1)
    })
    const [html, title] = printExportHtml.mock.calls[0]
    expect(html).toContain('<h1 id="printable">Printable</h1>')
    expect(title).toBe('print.md')
    expect(screen.getByText('Print dialog opened')).toBeInTheDocument()
  })
})

function renderApp(props: ComponentProps<typeof App>) {
  return render(<App {...props} initialLanguage={props.initialLanguage ?? 'en'} />)
}

async function openFileMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Open' }))
}

async function openLogoMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Open application menu' }))
}

function file(path: string, content: string): OpenedMarkdownFile {
  return { path, content }
}

function createFileAccess(
  overrides: {
    startupFile?: OpenedMarkdownFile | null
    openFile?: OpenedMarkdownFile | null
    supportsNativeFiles?: boolean
    saveMarkdownFile?: FileAccess['saveMarkdownFile']
    saveMarkdownFileAs?: FileAccess['saveMarkdownFileAs']
    exportHtmlFile?: FileAccess['exportHtmlFile']
    printExportHtml?: FileAccess['printExportHtml']
    openMarkdownFileAtPath?: FileAccess['openMarkdownFileAtPath']
    readLocalImageFile?: FileAccess['readLocalImageFile']
    listenForOpenedFiles?: FileAccess['listenForOpenedFiles']
  } = {},
): FileAccess {
  return {
    supportsNativeFiles: overrides.supportsNativeFiles ?? true,
    openMarkdownFile: vi.fn(async () => overrides.openFile ?? null),
    openMarkdownFileAtPath:
      overrides.openMarkdownFileAtPath ?? vi.fn(async (path) => file(path, '# Recent')),
    saveMarkdownFile: overrides.saveMarkdownFile ?? vi.fn(async (path) => path),
    saveMarkdownFileAs: overrides.saveMarkdownFileAs ?? vi.fn(async () => '/tmp/saved-as.md'),
    exportHtmlFile: overrides.exportHtmlFile ?? vi.fn(async () => '/tmp/export.html'),
    printExportHtml: overrides.printExportHtml ?? vi.fn(async () => undefined),
    readLocalImageFile:
      overrides.readLocalImageFile ??
      vi.fn(async (path) => ({ path, dataUrl: 'data:image/png;base64,test' })),
    readStartupMarkdownFile: vi.fn(async () => overrides.startupFile ?? null),
    listenForOpenedFiles: overrides.listenForOpenedFiles ?? vi.fn(async () => null),
  }
}

function recent(path: string, lastOpenedAt: string): RecentFile {
  return {
    path,
    title: path.split('/').at(-1) ?? path,
    lastOpenedAt,
  }
}

function seedRecentFiles(recentFiles: RecentFile[]) {
  window.localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(recentFiles))
}

function getStoredRecentFiles(): RecentFile[] {
  return JSON.parse(window.localStorage.getItem(RECENT_FILES_STORAGE_KEY) ?? '[]') as RecentFile[]
}
