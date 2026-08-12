import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { appInfo } from './appInfo'
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

  it('loads a markdown file passed by the desktop shell at startup', async () => {
    renderApp({ fileAccess: createFileAccess({ startupFile: file('/tmp/start.md', '# Startup') }) })

    expect(
      await screen.findByRole('heading', { name: 'Startup' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('start.md')).toBeInTheDocument()
    await waitFor(() => {
      expect(getStoredRecentFiles().map((file) => file.path)).toEqual(['/tmp/start.md'])
    })
  })

  it('opens a markdown file from the File menu', async () => {
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

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Save' }))

    await waitFor(() => {
      expect(saveMarkdownFile).toHaveBeenCalledWith('/tmp/draft.md', '# Changed')
    })
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('shows a welcome workspace before a document is opened or created', async () => {
    const user = userEvent.setup()
    renderWelcomeApp({ fileAccess: createFileAccess() })

    expect(screen.getByRole('heading', { name: 'Open a Markdown file' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Markdown File' })).toBeInTheDocument()
    expect(screen.getByText('No recent files')).toBeInTheDocument()
    expect(screen.queryByLabelText('View mode')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create new markdown file' }))

    expect(screen.queryByRole('heading', { name: 'Open a Markdown file' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Markdown source' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit markdown source' })).toHaveClass('active')
  })

  it('suggests a filename from the first meaningful line when saving a new document', async () => {
    const user = userEvent.setup()
    const saveMarkdownFileAs = vi.fn(async () => null)
    renderWelcomeApp({
      fileAccess: createFileAccess({ saveMarkdownFileAs }),
    })

    await user.click(screen.getByRole('button', { name: 'Create new markdown file' }))
    const editor = screen.getByRole('textbox', { name: 'Markdown source' })
    fireEvent.change(editor, { target: { value: '\n会议记录\n\n# 项目说明' } })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Save' }))

    await waitFor(() => {
      expect(saveMarkdownFileAs).toHaveBeenCalledWith(
        '\n会议记录\n\n# 项目说明',
        '会议记录.md',
      )
    })
  })

  it('opens recent files directly from the welcome workspace', async () => {
    const user = userEvent.setup()
    const openMarkdownFileAtPath = vi.fn(async (path: string) => file(path, '# Recent document'))
    seedRecentFiles([recent('/tmp/recent.md', '2026-07-10T08:00:00.000Z')])
    renderWelcomeApp({
      fileAccess: createFileAccess({ openMarkdownFileAtPath }),
    })

    await user.click(screen.getByRole('button', { name: 'Open recent file recent.md' }))

    expect(openMarkdownFileAtPath).toHaveBeenCalledWith('/tmp/recent.md')
    expect(await screen.findByRole('heading', { name: 'Recent document' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Open a Markdown file' })).not.toBeInTheDocument()
  })

  it('keeps edits made during an in-flight save marked as unsaved', async () => {
    const user = userEvent.setup()
    let completeSave: ((path: string) => void) | undefined
    const saveMarkdownFile = vi.fn(
      () => new Promise<string>((resolve) => {
        completeSave = resolve
      }),
    )
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/draft.md', '# Draft'),
        saveMarkdownFile,
      }),
    })

    await screen.findByRole('heading', { name: 'Draft' })
    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))
    const editor = screen.getByRole('textbox', { name: 'Markdown source' })
    fireEvent.change(editor, { target: { value: '# Saving snapshot' } })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Save' }))
    await waitFor(() => {
      expect(saveMarkdownFile).toHaveBeenCalledWith('/tmp/draft.md', '# Saving snapshot')
    })

    fireEvent.change(editor, { target: { value: '# Edited after save started' } })
    await act(async () => {
      completeSave?.('/tmp/draft.md')
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByText('Unsaved')).toBeInTheDocument()
    })
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

    await openAppMenu(user)
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

  it('opens an App menu with about and language actions', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess() })

    await openAppMenu(user)

    expect(screen.getByRole('menuitem', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByText('Interface language')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '中文' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Reading Settings' })).toBeInTheDocument()
  })

  it('offers to restore a pending draft during a normal launch', async () => {
    const user = userEvent.setup()
    seedDocumentDraft({
      id: 'recoverable-draft',
      path: '/tmp/recover.md',
      title: 'recover.md',
      content: '# Restored draft',
      updatedAt: Date.now(),
    })
    renderWelcomeApp({
      fileAccess: createFileAccess({
        openMarkdownFileAtPath: vi.fn(async (path) => file(path, '# Saved baseline')),
      }),
    })

    expect(await screen.findByRole('dialog', { name: 'Recover unsaved draft' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restore draft' }))

    expect(await screen.findByRole('textbox', { name: 'Markdown source' })).toHaveValue('# Restored draft')
    expect(screen.getByText('Unsaved')).toBeInTheDocument()
  })

  it('keeps an old draft when a startup file takes priority', async () => {
    seedDocumentDraft({
      id: 'older-draft',
      path: null,
      title: 'Untitled.md',
      content: '# Older draft',
      updatedAt: Date.now(),
    })
    renderWelcomeApp({ fileAccess: createFileAccess({ startupFile: file('/tmp/start.md', '# Startup') }) })

    expect(await screen.findByRole('heading', { name: 'Startup' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Recover unsaved draft' })).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(DOCUMENT_DRAFT_STORAGE_KEY) ?? '{}')).toMatchObject({
      id: 'older-draft',
      content: '# Older draft',
    })
  })

  it('discards a pending draft and returns to the welcome workspace', async () => {
    const user = userEvent.setup()
    seedDocumentDraft({
      id: 'discardable-draft',
      path: null,
      title: 'Untitled.md',
      content: '# Discard this',
      updatedAt: Date.now(),
    })
    renderWelcomeApp({ fileAccess: createFileAccess() })

    expect(await screen.findByRole('dialog', { name: 'Recover unsaved draft' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Discard draft' }))

    expect(await screen.findByRole('heading', { name: 'Open a Markdown file' })).toBeInTheDocument()
    expect(window.localStorage.getItem(DOCUMENT_DRAFT_STORAGE_KEY)).toBeNull()
  })

  it('restores a missing source file as an untitled unsaved document', async () => {
    const user = userEvent.setup()
    seedDocumentDraft({
      id: 'missing-source-draft',
      path: '/tmp/missing.md',
      title: 'missing.md',
      content: '# Recovered without source',
      updatedAt: Date.now(),
    })
    renderWelcomeApp({
      fileAccess: createFileAccess({
        openMarkdownFileAtPath: vi.fn(async () => {
          throw new Error('File missing')
        }),
      }),
    })

    await user.click(await screen.findByRole('button', { name: 'Restore draft' }))

    expect(await screen.findByRole('textbox', { name: 'Markdown source' })).toHaveValue('# Recovered without source')
    expect(screen.getByText('Untitled.md')).toBeInTheDocument()
  })

  it('backs up a dirty document and clears its draft after saving', async () => {
    const user = userEvent.setup()
    const saveMarkdownFile = vi.fn(async (path: string) => path)
    renderWelcomeApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/backup.md', '# Backup'),
        saveMarkdownFile,
      }),
    })

    await screen.findByRole('heading', { name: 'Backup' })
    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Markdown source' }), {
      target: { value: '# Changed for backup' },
    })

    await waitFor(() => {
      expect(window.localStorage.getItem(DOCUMENT_DRAFT_STORAGE_KEY)).toContain('# Changed for backup')
    }, { timeout: 2_000 })

    await openFileMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Save' }))

    await waitFor(() => {
      expect(saveMarkdownFile).toHaveBeenCalledWith('/tmp/backup.md', '# Changed for backup')
      expect(window.localStorage.getItem(DOCUMENT_DRAFT_STORAGE_KEY)).toBeNull()
    })
  })

  it('applies and persists reading settings from the App menu', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess() })

    await openAppMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Reading Settings' }))
    expect(screen.getByRole('dialog', { name: 'Reading Settings' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dark' }))

    await waitFor(() => {
      expect(document.documentElement.dataset.mdviewColorTheme).toBe('dark')
    })
    expect(JSON.parse(window.localStorage.getItem('mdview.readingPreferences.v1') ?? '{}')).toMatchObject({
      themeMode: 'dark',
    })
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
  } = {},
): FileAccess {
  return {
    supportsNativeFiles: overrides.supportsNativeFiles ?? true,
    supportsImageImport: overrides.supportsImageImport ?? true,
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

void openExportMenu
void getStoredOutlinePreferences
void mockElementTop
