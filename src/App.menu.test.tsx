import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { DOCUMENT_DRAFT_STORAGE_KEY } from './domain/documentDraft'
import { RECENT_FILES_STORAGE_KEY, type RecentFile } from './domain/recentFiles'
import { OUTLINE_PREFERENCES_STORAGE_KEY } from './domain/outlinePreferences'
import type { FileAccess, OpenedMarkdownFile } from './platform/fileAccess'


describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-mdview-color-theme')
    document.documentElement.removeAttribute('data-mdview-font-family')
    document.documentElement.style.removeProperty('--reader-font-size')
    document.documentElement.style.removeProperty('--reader-line-height')
    document.documentElement.style.removeProperty('--reader-content-width')
    setNavigatorPlatform('Win32')
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

  it('imports a ready Word document into an unsaved Markdown draft', async () => {
    const user = userEvent.setup()
    const importFile = vi.fn(async () => ({
      sourcePath: '/tmp/report.docx',
      suggestedFilename: 'report.md',
      content: '# Imported report',
    }))
    renderApp({ fileAccess: createFileAccess({ docxImport: {
      getStatus: vi.fn(async () => ({ state: 'ready' as const, canInstallPython: true })),
      selectPython: vi.fn(), install: vi.fn(), importFile, cancel: vi.fn(),
    } }) })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Import Word (.docx)' }))
    await user.click(await screen.findByRole('button', { name: 'Choose and convert .docx' }))

    expect(importFile).toHaveBeenCalledOnce()
    expect((await screen.findAllByText('Imported report')).length).toBeGreaterThan(0)
    expect(screen.getByText('Word document imported as an unsaved Markdown draft.')).toBeInTheDocument()
  })

  it('reuses the Word converter status when reopening the dialog', async () => {
    const user = userEvent.setup()
    const getStatus = vi.fn(async () => ({ state: 'ready' as const, canInstallPython: true }))
    renderApp({ fileAccess: createFileAccess({ docxImport: {
      getStatus, selectPython: vi.fn(), install: vi.fn(), importFile: vi.fn(), cancel: vi.fn(),
    } }) })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Import Word (.docx)' }))
    await screen.findByRole('button', { name: 'Choose and convert .docx' })
    await user.click(screen.getByRole('button', { name: 'Close Word import dialog' }))
    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Import Word (.docx)' }))

    expect(getStatus).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Choose and convert .docx' })).toBeInTheDocument()
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

  it('places save actions directly below the open action in the File menu', async () => {
    const user = userEvent.setup()
    seedRecentFiles([recent('/tmp/recent.md', '2026-01-01T00:00:00.000Z')])
    renderApp({ fileAccess: createFileAccess() })

    await openFileMenu(user)

    expect(screen.getByRole('menuitem', { name: 'New' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Open Markdown File' })).toBeInTheDocument()
    expect(screen.getByText('Recent files')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'recent.md' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Save As' })).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('menuitem')
        .map((item) => item.getAttribute('aria-label') ?? item.textContent),
    ).toEqual([
      'New',
      'Open Markdown File',
      'Save',
      'Save As',
      'recent.md',
      'Reveal recent.md in folder',
      'Clear recent files',
    ])
  })

  it('shows export actions together in the Export menu', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess() })

    await openExportMenu(user)

    expect(screen.getByRole('menuitem', { name: 'Export as HTML' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Export as PDF' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Export as Word (.docx)' })).toBeInTheDocument()
  })

  it('adds successful save-as paths to recent files', async () => {
    const user = userEvent.setup()
    renderApp({
      fileAccess: createFileAccess({
        saveMarkdownFileAs: vi.fn(async () => '/tmp/saved-as.md'),
      }),
    })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Save As' }))
    await openFileMenu(user)

    expect(await screen.findByRole('menuitem', { name: 'saved-as.md' })).toHaveAttribute(
      'title',
      '/tmp/saved-as.md',
    )
  })

  it('runs common Windows file shortcuts from anywhere in the app', async () => {
    const saveMarkdownFile = vi.fn(async (path: string) => path)
    const saveMarkdownFileAs = vi.fn(async () => '/tmp/saved-as.md')
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/draft.md', '# Draft'),
        openFile: file('/tmp/opened.md', '# Opened'),
        saveMarkdownFile,
        saveMarkdownFileAs,
      }),
    })

    expect(await screen.findByRole('heading', { name: 'Draft' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    await waitFor(() => {
      expect(saveMarkdownFile).toHaveBeenCalledWith('/tmp/draft.md', '# Draft')
    })
    expect(screen.getByRole('status', { name: 'Notification' })).toHaveTextContent('Saved')

    fireEvent.keyDown(window, { key: 's', ctrlKey: true, shiftKey: true })
    await waitFor(() => {
      expect(saveMarkdownFileAs).toHaveBeenCalledWith('# Draft', '/tmp/draft.md')
    })

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    expect(screen.getByText('Untitled.md')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'o', ctrlKey: true })
    expect(await screen.findByRole('heading', { name: 'Opened' })).toBeInTheDocument()
  })

  it('finds and replaces Markdown source text with Ctrl+F', async () => {
    const user = userEvent.setup()
    renderWelcomeApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/search.md', '# Draft\n\nDraft body'),
      }),
    })

    await screen.findByRole('heading', { name: 'Draft' })
    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    const findInput = await screen.findByRole('textbox', { name: 'Find' })
    fireEvent.change(findInput, { target: { value: 'Draft' } })

    expect(await screen.findByText('1/2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show replace' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Replacement' }), {
      target: { value: 'Note' },
    })
    await user.click(screen.getByRole('button', { name: 'Replace All' }))

    expect(screen.getByRole('textbox', { name: 'Markdown source' })).toHaveValue('# Note\n\nNote body')
  })

  it('uses Command instead of Ctrl for macOS file shortcuts', async () => {
    setNavigatorPlatform('MacIntel')
    const saveMarkdownFile = vi.fn(async (path: string) => path)
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/mac.md', '# Mac'),
        saveMarkdownFile,
      }),
    })

    expect(await screen.findByRole('heading', { name: 'Mac' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(saveMarkdownFile).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 's', metaKey: true })
    await waitFor(() => {
      expect(saveMarkdownFile).toHaveBeenCalledWith('/tmp/mac.md', '# Mac')
    })
    expect(screen.getByRole('status', { name: 'Notification' })).toHaveTextContent('Saved')
  })

  it('keeps the file menu available but disables native file actions when unavailable', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess({ supportsNativeFiles: false }) })

    await openFileMenu(user)

    expect(screen.getByRole('menuitem', { name: 'New' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Open Markdown File' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Save As' })).toBeDisabled()
  })

  it('uses Chinese interface text when the system language is Chinese and can switch languages', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess(), initialLanguage: 'zh' })

    expect(screen.getByRole('button', { name: '预览 Markdown' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '编辑 Markdown 源码' }))
    expect(screen.getByText('已保存')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '文件' }))
    expect(screen.getByRole('menuitem', { name: '新建' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '应用' }))

    expect(screen.getByRole('menuitem', { name: '关于' })).toBeInTheDocument()
    expect(screen.getByText('界面语言')).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'English' }))

    expect(screen.getByRole('button', { name: 'File' })).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('closes open menus with Escape and outside clicks', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess() })

    await openAppMenu(user)
    expect(screen.getByRole('menuitem', { name: 'About' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menuitem', { name: 'About' })).not.toBeInTheDocument()

    await openAppMenu(user)
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

  it('reveals a recent file from the File menu without opening it', async () => {
    const user = userEvent.setup()
    const revealFileInFolder = vi.fn(async () => undefined)
    seedRecentFiles([recent('/tmp/recent.md', '2026-01-01T00:00:00.000Z')])
    renderApp({ fileAccess: createFileAccess({ revealFileInFolder }) })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Reveal recent.md in folder' }))

    expect(revealFileInFolder).toHaveBeenCalledWith('/tmp/recent.md')
    expect(screen.getByRole('menuitem', { name: 'recent.md' })).toBeInTheDocument()
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
    renderApp({ fileAccess: createFileAccess(), initialLanguage: 'zh' })

    await user.click(screen.getByRole('button', { name: '文件' }))

    expect(screen.getByText('没有最近文件')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '清空最近文件' })).toBeDisabled()
  })

})

function renderApp(props: ComponentProps<typeof App>) {
  const result = renderWelcomeApp(props)
  fireEvent.click(screen.getByRole('button', { name: /Create new markdown file|新建 Markdown 文件/ }))
  fireEvent.click(screen.getByRole('button', { name: /Preview markdown|预览 Markdown/ }))
  return result
}

function renderWelcomeApp(props: ComponentProps<typeof App>) {
  return render(<App {...props} initialLanguage={props.initialLanguage ?? 'en'} />)
}

async function openFileMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'File' }))
}

async function openExportMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Export' }))
}

async function openAppMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'App' }))
}

function file(path: string, content: string): OpenedMarkdownFile {
  return { path, content }
}

function createFileAccess(
  overrides: {
    startupFile?: OpenedMarkdownFile | null
    openFile?: OpenedMarkdownFile | null
    supportsNativeFiles?: boolean
    supportsImageImport?: boolean
    saveMarkdownFile?: FileAccess['saveMarkdownFile']
    saveMarkdownFileAs?: FileAccess['saveMarkdownFileAs']
    exportHtmlFile?: FileAccess['exportHtmlFile']
    exportDocxFile?: FileAccess['exportDocxFile']
    printExportHtml?: FileAccess['printExportHtml']
    openMarkdownFileAtPath?: FileAccess['openMarkdownFileAtPath']
    revealFileInFolder?: FileAccess['revealFileInFolder']
    readLocalImageFile?: FileAccess['readLocalImageFile']
    writeImageAsset?: FileAccess['writeImageAsset']
    listenForOpenedFiles?: FileAccess['listenForOpenedFiles']
    docxImport?: FileAccess['docxImport']
  } = {},
): FileAccess {
  return {
    supportsNativeFiles: overrides.supportsNativeFiles ?? true,
    supportsImageImport: overrides.supportsImageImport ?? true,
    docxImport: overrides.docxImport,
    openMarkdownFile: vi.fn(async () => overrides.openFile ?? null),
    openMarkdownFileAtPath:
      overrides.openMarkdownFileAtPath ?? vi.fn(async (path) => file(path, '# Recent')),
    revealFileInFolder: overrides.revealFileInFolder ?? vi.fn(async () => undefined),
    saveMarkdownFile: overrides.saveMarkdownFile ?? vi.fn(async (path) => path),
    saveMarkdownFileAs: overrides.saveMarkdownFileAs ?? vi.fn(async () => '/tmp/saved-as.md'),
    exportHtmlFile: overrides.exportHtmlFile ?? vi.fn(async () => '/tmp/export.html'),
    exportDocxFile: overrides.exportDocxFile ?? vi.fn(async () => '/tmp/export.docx'),
    printExportHtml: overrides.printExportHtml ?? vi.fn(async () => undefined),
    readLocalImageFile:
      overrides.readLocalImageFile ??
      vi.fn(async (path) => ({ path, dataUrl: 'data:image/png;base64,test' })),
    writeImageAsset: overrides.writeImageAsset ?? vi.fn(async () => ({
      path: '/tmp/assets/image.png',
      relativePath: 'assets/image.png',
      filename: 'image.png',
    })),
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

function seedDocumentDraft(draft: Record<string, unknown>) {
  window.localStorage.setItem(DOCUMENT_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

function getStoredRecentFiles(): RecentFile[] {
  return JSON.parse(window.localStorage.getItem(RECENT_FILES_STORAGE_KEY) ?? '[]') as RecentFile[]
}

function getStoredOutlinePreferences(): Record<string, unknown> {
  return JSON.parse(window.localStorage.getItem(OUTLINE_PREFERENCES_STORAGE_KEY) ?? '{}') as Record<
    string,
    unknown
  >
}

function mockElementTop(element: Element, top: number) {
  element.getBoundingClientRect = vi.fn(() => ({
    x: 0,
    y: top,
    top,
    left: 0,
    right: 0,
    bottom: top,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  }))
}

function setNavigatorPlatform(platform: string) {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}

void seedDocumentDraft
void getStoredOutlinePreferences
void mockElementTop
