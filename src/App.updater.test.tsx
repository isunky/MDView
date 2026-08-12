import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { appInfo } from './appInfo'
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

void openFileMenu
void openExportMenu
void recent
void seedRecentFiles
void seedDocumentDraft
void getStoredRecentFiles
void getStoredOutlinePreferences
void mockElementTop
