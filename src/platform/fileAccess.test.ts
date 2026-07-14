import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
const webviewWindows: Array<{
  label: string
  options: { title?: string; url?: string }
}> = []

vi.mock('@tauri-apps/api/core', () => ({
  invoke,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}))

vi.mock('@tauri-apps/api/webviewWindow', () => ({
  WebviewWindow: class {
    label: string
    options: { title?: string; url?: string }

    constructor(label: string, options: { title?: string; url?: string }) {
      this.label = label
      this.options = options
      webviewWindows.push({ label, options })
    }

    async once(event: string, handler: (event: { payload?: unknown }) => void) {
      if (event === 'tauri://created') {
        window.setTimeout(() => handler({}), 0)
      }
      return vi.fn()
    }
  },
}))

describe('file access PDF export', () => {
  beforeEach(() => {
    invoke.mockReset()
    webviewWindows.length = 0
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    document.title = ''

    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: {},
    })
  })

  it('exports DOCX bytes through the native save dialog', async () => {
    invoke.mockResolvedValueOnce('C:\\Docs\\report.docx')
    const { tauriFileAccess } = await import('./fileAccess')

    const savedPath = await tauriFileAccess.exportDocxFile(
      new Uint8Array([0x50, 0x4b]),
      'C:\\Docs\\report.md',
      'report.md',
    )

    expect(invoke).toHaveBeenCalledWith('export_docx_file_dialog', {
      bytes: [0x50, 0x4b],
      defaultPath: 'C:\\Docs\\report.docx',
    })
    expect(savedPath).toBe('C:\\Docs\\report.docx')
  })

  it('reveals a markdown file in the system file manager', async () => {
    const { tauriFileAccess } = await import('./fileAccess')

    await tauriFileAccess.revealFileInFolder('C:\\Docs\\report.md')

    expect(invoke).toHaveBeenCalledWith('reveal_file_in_folder', {
      path: 'C:\\Docs\\report.md',
    })
  })

  it('opens and saves files through policy-enforced backend dialogs', async () => {
    invoke
      .mockResolvedValueOnce({ path: 'C:\\Docs\\readme.md', content: '# Readme' })
      .mockResolvedValueOnce('C:\\Docs\\saved.md')
    const { tauriFileAccess } = await import('./fileAccess')

    await expect(tauriFileAccess.openMarkdownFile()).resolves.toEqual({
      path: 'C:\\Docs\\readme.md',
      content: '# Readme',
    })
    await expect(tauriFileAccess.saveMarkdownFileAs('# Saved', null)).resolves.toBe(
      'C:\\Docs\\saved.md',
    )

    expect(invoke).toHaveBeenNthCalledWith(1, 'open_markdown_file_dialog')
    expect(invoke).toHaveBeenNthCalledWith(2, 'save_markdown_file_dialog', {
      content: '# Saved',
      defaultPath: 'Untitled.md',
    })
  })

  it('prints the exported markdown document through a dedicated Tauri window', async () => {
    const { tauriFileAccess } = await import('./fileAccess')
    const html = [
      '<!doctype html>',
      '<html>',
      '<head><style>.markdown-preview { color: red; }</style></head>',
      '<body><article class="markdown-preview"><h1>Printable</h1></article></body>',
      '</html>',
    ].join('')

    await tauriFileAccess.printExportHtml(html, 'print.md')

    expect(webviewWindows).toHaveLength(1)
    expect(webviewWindows[0].options.title).toBe('print.md')
    expect(decodeURIComponent(webviewWindows[0].options.url ?? '')).toContain('<h1>Printable</h1>')
    expect(invoke).toHaveBeenCalledWith('plugin:webview|print', { label: webviewWindows[0].label })
  })
})
