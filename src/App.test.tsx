import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { appInfo } from './appInfo'
import * as markdownOutline from './domain/markdownOutline'
import { DOCUMENT_DRAFT_STORAGE_KEY } from './domain/documentDraft'
import { RECENT_FILES_STORAGE_KEY, type RecentFile } from './domain/recentFiles'
import { OUTLINE_PREFERENCES_STORAGE_KEY } from './domain/outlinePreferences'
import type { AppDistribution, AppUpdateCandidate, AppUpdateClient } from './platform/appUpdates'
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

  it('keeps the update dialog open when the installed Windows version is current', async () => {
    const user = userEvent.setup()
    const checkForUpdate = vi.fn(async () => null)
    const appUpdateClient: AppUpdateClient = {
      getDistribution: vi.fn(async (): Promise<AppDistribution> => 'windows-installed'),
      checkForUpdate,
      downloadAndInstall: vi.fn(async () => undefined),
      openLatestRelease: vi.fn(async () => undefined),
    }
    renderApp({ appUpdateClient, fileAccess: createFileAccess() })

    await waitFor(() => {
      expect(appUpdateClient.getDistribution).toHaveBeenCalled()
    })
    await openAppMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Check for Updates' }))

    expect(checkForUpdate).toHaveBeenCalledTimes(1)
    const dialog = await screen.findByRole('dialog', { name: 'Software Update' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('MDView is up to date')).toBeInTheDocument()
    expect(screen.getByText(appInfo.version)).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Shortcut notification' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Software Update' })).not.toBeInTheDocument()
  })

  it('closes and ignores an in-progress update check', async () => {
    const user = userEvent.setup()
    let resolveCheck: (candidate: AppUpdateCandidate | null) => void = () => undefined
    const appUpdateClient: AppUpdateClient = {
      getDistribution: vi.fn(async (): Promise<AppDistribution> => 'windows-installed'),
      checkForUpdate: vi.fn(() => new Promise<AppUpdateCandidate | null>((resolve) => {
        resolveCheck = resolve
      })),
      cancelPendingUpdate: vi.fn(async () => undefined),
      downloadAndInstall: vi.fn(async () => undefined),
      openLatestRelease: vi.fn(async () => undefined),
    }
    renderApp({ appUpdateClient, fileAccess: createFileAccess() })

    await waitFor(() => {
      expect(appUpdateClient.getDistribution).toHaveBeenCalled()
    })
    await openAppMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Check for Updates' }))

    expect(await screen.findByRole('dialog', { name: 'Software Update' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close update dialog' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Close update dialog' }))
    expect(screen.queryByRole('dialog', { name: 'Software Update' })).not.toBeInTheDocument()

    await act(async () => {
      resolveCheck({ currentVersion: '2.3.2', version: '2.3.3' })
      await Promise.resolve()
    })
    expect(screen.queryByRole('dialog', { name: 'Software Update' })).not.toBeInTheDocument()
    expect(appUpdateClient.cancelPendingUpdate).toHaveBeenCalled()
  })

  it('downloads an update for the Windows MSI installation', async () => {
    const user = userEvent.setup()
    const downloadAndInstall = vi.fn(async (onProgress: Parameters<AppUpdateClient['downloadAndInstall']>[0]) => {
      onProgress({ downloadedBytes: 64, totalBytes: 64 })
    })
    const appUpdateClient: AppUpdateClient = {
      getDistribution: vi.fn(async (): Promise<AppDistribution> => 'windows-installed'),
      checkForUpdate: vi.fn(async () => ({
        currentVersion: '1.9.3',
        version: '1.9.4',
        notes: 'Update notes',
      })),
      downloadAndInstall,
      openLatestRelease: vi.fn(async () => undefined),
    }
    renderApp({ appUpdateClient, fileAccess: createFileAccess() })

    await waitFor(() => {
      expect(appUpdateClient.getDistribution).toHaveBeenCalled()
    })
    await openAppMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Check for Updates' }))

    expect(await screen.findByRole('dialog', { name: 'Software Update' })).toBeInTheDocument()
    expect(screen.getByText('1.9.4')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Download and Install' }))

    await waitFor(() => {
      expect(downloadAndInstall).toHaveBeenCalledTimes(1)
    })
  })

  it('keeps portable Windows updates as a GitHub download', async () => {
    const user = userEvent.setup()
    const downloadAndInstall = vi.fn(async () => undefined)
    const openLatestRelease = vi.fn(async () => undefined)
    const appUpdateClient: AppUpdateClient = {
      getDistribution: vi.fn(async (): Promise<AppDistribution> => 'windows-portable'),
      checkForUpdate: vi.fn(async () => ({ currentVersion: '1.9.3', version: '1.9.4' })),
      downloadAndInstall,
      openLatestRelease,
    }
    renderApp({ appUpdateClient, fileAccess: createFileAccess() })

    await waitFor(() => {
      expect(appUpdateClient.getDistribution).toHaveBeenCalled()
    })
    await openAppMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Check for Updates' }))
    await user.click(await screen.findByRole('button', { name: 'Download Portable ZIP' }))

    expect(openLatestRelease).toHaveBeenCalledTimes(1)
    expect(downloadAndInstall).not.toHaveBeenCalled()
  })

  it('requires saving an edited document before installing an update', async () => {
    const user = userEvent.setup()
    const downloadAndInstall = vi.fn(async () => undefined)
    const appUpdateClient: AppUpdateClient = {
      getDistribution: vi.fn(async (): Promise<AppDistribution> => 'windows-installed'),
      checkForUpdate: vi.fn(async () => ({ currentVersion: '1.9.3', version: '1.9.4' })),
      downloadAndInstall,
      openLatestRelease: vi.fn(async () => undefined),
    }
    renderApp({ appUpdateClient, fileAccess: createFileAccess() })

    await waitFor(() => {
      expect(appUpdateClient.getDistribution).toHaveBeenCalled()
    })
    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))
    await user.type(screen.getByRole('textbox', { name: 'Markdown source' }), 'Unsaved')
    await openAppMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Check for Updates' }))
    await user.click(await screen.findByRole('button', { name: 'Download and Install' }))

    expect(downloadAndInstall).not.toHaveBeenCalled()
    expect(await screen.findByText('Save your document before installing an update.')).toBeInTheDocument()
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
    const previewPanel = screen.getByLabelText('Preview panel')
    const scrollTo = vi.fn()
    previewPanel.scrollTop = 200
    previewPanel.scrollTo = scrollTo
    mockElementTop(previewPanel, 100)
    mockElementTop(screen.getByRole('heading', { name: 'Project Plan' }), 100)
    mockElementTop(screen.getByRole('heading', { name: 'Scope' }), 320)
    mockElementTop(screen.getByRole('heading', { name: 'Details' }), 520)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Jump to Project Plan' })).toHaveAttribute(
        'aria-current',
        'location',
      )
    })

    await user.click(screen.getByRole('button', { name: 'Jump to Scope' }))

    expect(scrollTo).toHaveBeenCalledWith({ top: 404, behavior: 'smooth' })
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'auto',
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Jump to Scope' })).toHaveAttribute(
        'aria-current',
        'location',
      )
    })

    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))

    expect(screen.queryByRole('navigation', { name: 'Document outline' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Split preview and source' }))

    expect(screen.queryByRole('navigation', { name: 'Document outline' })).not.toBeInTheDocument()
  })

  it('zooms the preview with Ctrl + mouse wheel', () => {
    renderApp({ fileAccess: createFileAccess({ startupFile: file('/tmp/zoom.md', '# Zoom') }) })

    const previewPanel = screen.getByLabelText('Preview panel')
    expect(previewPanel).toHaveStyle('--preview-zoom: 1')

    const zoomInEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: -100,
    })

    act(() => {
      previewPanel.dispatchEvent(zoomInEvent)
    })

    expect(zoomInEvent.defaultPrevented).toBe(true)
    expect(previewPanel).toHaveStyle('--preview-zoom: 1.1')
    const zoomToast = screen.getByRole('status', { name: 'Shortcut notification' })
    expect(zoomToast).toHaveTextContent('110%')
    expect(zoomToast).toHaveClass('zoom-toast')
    expect(zoomToast.parentElement).toHaveClass('zoom-toast-layer')

    const zoomOutEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: 100,
    })

    act(() => {
      previewPanel.dispatchEvent(zoomOutEvent)
    })

    expect(zoomOutEvent.defaultPrevented).toBe(true)
    expect(previewPanel).toHaveStyle('--preview-zoom: 1')
    expect(
      screen.getByRole('status', { name: 'Shortcut notification' }),
    ).toHaveTextContent('100%')
  })

  it('keeps normal preview wheel scrolling unchanged', () => {
    renderApp({ fileAccess: createFileAccess() })

    const previewPanel = screen.getByLabelText('Preview panel')
    const scrollEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: false,
      deltaY: 100,
    })

    act(() => {
      previewPanel.dispatchEvent(scrollEvent)
    })

    expect(scrollEvent.defaultPrevented).toBe(false)
    expect(previewPanel).toHaveStyle('--preview-zoom: 1')
  })

  it('debounces preview updates while editing in split mode', () => {
    vi.useFakeTimers()

    try {
      renderApp({ fileAccess: createFileAccess() })
      fireEvent.click(screen.getByRole('button', { name: 'Split preview and source' }))

      const editor = screen.getByRole('textbox', { name: 'Markdown source' })
      fireEvent.change(editor, { target: { value: '# Debounced preview' } })

      expect(editor).toHaveValue('# Debounced preview')
      expect(screen.getByRole('heading', { name: 'Untitled' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Debounced preview' })).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(119)
      })
      expect(screen.queryByRole('heading', { name: 'Debounced preview' })).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(screen.getByRole('heading', { name: 'Debounced preview' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not update hidden preview or parse the outline while editing', async () => {
    const user = userEvent.setup()
    const extractOutline = vi.spyOn(markdownOutline, 'extractMarkdownOutline')
    renderApp({ fileAccess: createFileAccess() })

    expect(screen.getByRole('heading', { name: 'Untitled' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))
    extractOutline.mockClear()

    fireEvent.change(screen.getByRole('textbox', { name: 'Markdown source' }), {
      target: { value: '# Edit only' },
    })

    expect(screen.getByRole('heading', { name: 'Untitled' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Edit only' })).not.toBeInTheDocument()
    expect(extractOutline).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Preview markdown' }))

    expect(screen.getByRole('heading', { name: 'Edit only' })).toBeInTheDocument()
    expect(extractOutline).toHaveBeenCalledTimes(1)
    extractOutline.mockRestore()
  })

  it('shows editor formatting tools in edit and split modes only', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess() })

    expect(screen.queryByRole('toolbar', { name: 'Markdown formatting' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit markdown source' }))

    expect(screen.getByRole('toolbar', { name: 'Markdown formatting' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Markdown syntax reference' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Split preview and source' }))

    expect(screen.getByRole('toolbar', { name: 'Markdown formatting' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Preview markdown' }))

    expect(screen.queryByRole('toolbar', { name: 'Markdown formatting' })).not.toBeInTheDocument()
  })

  it('shows and persists the split scroll synchronization toggle', async () => {
    const user = userEvent.setup()
    renderApp({ fileAccess: createFileAccess() })

    await user.click(screen.getByRole('button', { name: 'Split preview and source' }))
    const toggle = screen.getByRole('button', { name: 'Disable synchronized scrolling' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('toolbar', { name: 'Markdown formatting' })).toContainElement(toggle)
    expect(screen.getByRole('group', { name: 'View mode' })).not.toContainElement(toggle)

    await user.click(toggle)

    expect(screen.getByRole('button', { name: 'Enable synchronized scrolling' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('status', { name: 'Shortcut notification' })).toHaveTextContent(
      'Synchronized scrolling disabled',
    )
    expect(window.localStorage.getItem('mdview.splitScrollPreferences.v1')).toContain('false')
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
    expect(getStoredOutlinePreferences()).toMatchObject({ isOpen: false })

    await user.click(screen.getByRole('button', { name: 'Expand document outline' }))

    expect(screen.getByRole('navigation', { name: 'Document outline' })).toBeInTheDocument()
    expect(getStoredOutlinePreferences()).toMatchObject({ isOpen: true })
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
    expect(getStoredOutlinePreferences()).toMatchObject({ width: 340 })
  })

  it('restores saved outline preferences on startup', async () => {
    window.localStorage.setItem(
      OUTLINE_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ width: 360, isOpen: false }),
    )

    renderApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/outline.md', '# Project Plan\n\n## Scope'),
      }),
    })

    expect(await screen.findByRole('button', { name: 'Expand document outline' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Document outline' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Expand document outline' }))

    expect(screen.getByLabelText('Outline panel')).toHaveStyle({ width: '360px' })
  })

  it('changes and remembers the maximum outline heading depth', async () => {
    const user = userEvent.setup()
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file(
          '/tmp/outline.md',
          '# Level 1\n\n## Level 2\n\n### Level 3\n\n#### Level 4',
        ),
      }),
    })

    expect(await screen.findByRole('button', { name: 'Jump to Level 3' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Jump to Level 4' })).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Set outline depth'))
    await user.click(screen.getByRole('button', { name: 'Show through heading level 4' }))

    expect(screen.getByRole('button', { name: 'Jump to Level 4' })).toBeInTheDocument()
    expect(getStoredOutlinePreferences()).toMatchObject({ maxDepth: 4 })
  })

  it('syncs the active outline item with preview scrolling', async () => {
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/outline.md', '# Intro\n\n## First\n\n## Second'),
      }),
    })

    const previewPanel = await screen.findByLabelText('Preview panel')
    const firstHeading = screen.getByRole('heading', { name: 'First' })
    const secondHeading = screen.getByRole('heading', { name: 'Second' })
    mockElementTop(previewPanel, 100)
    mockElementTop(firstHeading, 80)
    mockElementTop(secondHeading, 130)

    fireEvent.scroll(previewPanel)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Jump to First' })).toHaveAttribute(
        'aria-current',
        'location',
      )
    })
  })

  it('keeps the clicked outline item active while smooth preview scrolling is in progress', async () => {
    const user = userEvent.setup()
    renderApp({
      fileAccess: createFileAccess({
        startupFile: file('/tmp/outline.md', '# Intro\n\n## First\n\n## Second'),
      }),
    })

    const previewPanel = await screen.findByLabelText('Preview panel')
    const scrollTo = vi.fn()
    previewPanel.scrollTo = scrollTo
    mockElementTop(previewPanel, 100)
    mockElementTop(screen.getByRole('heading', { name: 'First' }), 80)
    mockElementTop(screen.getByRole('heading', { name: 'Second' }), 360)
    fireEvent.scroll(previewPanel)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Jump to First' })).toHaveAttribute(
        'aria-current',
        'location',
      )
    })

    await user.click(screen.getByRole('button', { name: 'Jump to Second' }))
    expect(screen.getByRole('button', { name: 'Jump to Second' })).toHaveAttribute(
      'aria-current',
      'location',
    )

    mockElementTop(screen.getByRole('heading', { name: 'First' }), 80)
    mockElementTop(screen.getByRole('heading', { name: 'Second' }), 180)
    fireEvent.scroll(previewPanel)

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 50))
    })

    expect(screen.getByRole('button', { name: 'Jump to Second' })).toHaveAttribute(
      'aria-current',
      'location',
    )
    expect(screen.getByRole('button', { name: 'Jump to First' })).not.toHaveAttribute(
      'aria-current',
    )

    mockElementTop(screen.getByRole('heading', { name: 'First' }), 80)
    mockElementTop(screen.getByRole('heading', { name: 'Second' }), 117)
    previewPanel.scrollTop = 243
    fireEvent.scroll(previewPanel)

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 160))
    })

    expect(screen.getByRole('button', { name: 'Jump to Second' })).toHaveAttribute(
      'aria-current',
      'location',
    )
    expect(screen.getByRole('button', { name: 'Jump to First' })).not.toHaveAttribute(
      'aria-current',
    )
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

    expect(screen.getByRole('menuitem', { name: 'saved-as.md' })).toHaveAttribute(
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
    expect(screen.getByRole('status', { name: 'Shortcut notification' })).toHaveTextContent('Saved')

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
    expect(screen.getByRole('status', { name: 'Shortcut notification' })).toHaveTextContent('Saved')
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

    await openExportMenu(user)
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

    await openExportMenu(user)
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

    await openExportMenu(user)
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

    await openExportMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Export as PDF' }))

    await waitFor(() => {
      expect(printExportHtml).toHaveBeenCalledTimes(1)
    })
    const [html, title] = printExportHtml.mock.calls[0]
    expect(html).toContain('<h1 id="printable">Printable</h1>')
    expect(title).toBe('print.md')
    expect(screen.getByText('Print dialog opened')).toBeInTheDocument()
  })

  it('exports the current markdown document as DOCX', async () => {
    const user = userEvent.setup()
    let completeExport: ((path: string | null) => void) | null = null
    const exportDocxFile = vi.fn<FileAccess['exportDocxFile']>(
      () => new Promise((resolve) => {
        completeExport = resolve
      }),
    )
    renderApp({
      fileAccess: {
        ...createFileAccess({
          startupFile: file('/tmp/report.md', '# Report\n\nGenerated by **MDView**.'),
        }),
        exportDocxFile,
      } as FileAccess,
    })

    expect(await screen.findByRole('heading', { name: 'Report' })).toBeInTheDocument()

    await openExportMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Export as Word (.docx)' }))

    await waitFor(() => {
      expect(exportDocxFile).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByText('Generating Word document...')).toBeInTheDocument()
    const [bytes, currentPath, title] = exportDocxFile.mock.calls[0]
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(currentPath).toBe('/tmp/report.md')
    expect(title).toBe('report.md')

    act(() => {
      completeExport?.('/tmp/report.docx')
    })
    expect(await screen.findByText('Word exported')).toBeInTheDocument()
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
