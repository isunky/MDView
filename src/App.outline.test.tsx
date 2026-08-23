import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { preloadMarkdownPreview } from './components/lazyMarkdownPreview'
import * as markdownOutline from './domain/markdownOutline'
import { DOCUMENT_DRAFT_STORAGE_KEY } from './domain/documentDraft'
import { RECENT_FILES_STORAGE_KEY, type RecentFile } from './domain/recentFiles'
import { OUTLINE_PREFERENCES_STORAGE_KEY } from './domain/outlinePreferences'
import type { FileAccess, OpenedMarkdownFile } from './platform/fileAccess'


describe('App', () => {
  beforeEach(async () => {
    await preloadMarkdownPreview()
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-mdview-color-theme')
    document.documentElement.removeAttribute('data-mdview-font-family')
    document.documentElement.style.removeProperty('--reader-font-size')
    document.documentElement.style.removeProperty('--reader-line-height')
    document.documentElement.style.removeProperty('--reader-content-width')
    setNavigatorPlatform('Win32')
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
    mockElementTop(await screen.findByRole('heading', { name: 'Project Plan' }), 100)
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
    const zoomToast = screen.getByRole('status', { name: 'Notification' })
    expect(zoomToast).toHaveTextContent('110%')
    expect(zoomToast).toHaveClass('toast')
    expect(zoomToast.parentElement).toHaveClass('toast-layer')

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
      screen.getByRole('status', { name: 'Notification' }),
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

  it('debounces preview updates while editing in split mode', async () => {
    try {
      renderApp({ fileAccess: createFileAccess() })
      expect(await screen.findByRole('heading', { name: 'Untitled' })).toBeInTheDocument()
      vi.useFakeTimers()
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

    expect(await screen.findByRole('heading', { name: 'Untitled' })).toBeInTheDocument()
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
    expect(screen.getByRole('status', { name: 'Notification' })).toHaveTextContent(
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
void openAppMenu
void recent
void seedRecentFiles
void seedDocumentDraft
void getStoredRecentFiles
