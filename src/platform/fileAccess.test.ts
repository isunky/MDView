import { beforeEach, describe, expect, it, vi } from 'vitest'
import { save } from '@tauri-apps/plugin-dialog'

const invoke = vi.fn()
const revealItemInDir = vi.fn()
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

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-opener', () => ({
  revealItemInDir,
}))

describe('file access PDF export', () => {
  beforeEach(() => {
    invoke.mockReset()
    vi.mocked(save).mockReset()
    revealItemInDir.mockReset()
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
    vi.mocked(save).mockResolvedValue('C:\\Docs\\report')
    const { tauriFileAccess } = await import('./fileAccess')

    const savedPath = await tauriFileAccess.exportDocxFile(
      new Uint8Array([0x50, 0x4b]),
      'C:\\Docs\\report.md',
      'report.md',
    )

    expect(save).toHaveBeenCalledWith({
      defaultPath: 'C:\\Docs\\report.docx',
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    })
    expect(invoke).toHaveBeenCalledWith('write_docx_file', {
      path: 'C:\\Docs\\report.docx',
      bytes: [0x50, 0x4b],
    })
    expect(savedPath).toBe('C:\\Docs\\report.docx')
  })

  it('reveals a markdown file in the system file manager', async () => {
    const { tauriFileAccess } = await import('./fileAccess')

    await tauriFileAccess.revealFileInFolder('C:\\Docs\\report.md')

    expect(revealItemInDir).toHaveBeenCalledWith('C:\\Docs\\report.md')
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
