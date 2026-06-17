import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { open, save } from '@tauri-apps/plugin-dialog'
import { createExportHtmlDefaultPath } from '../domain/exportHtml'
import { ensureMarkdownExtension } from './markdownFiles'

export type OpenedMarkdownFile = {
  path: string
  content: string
}

export type LocalImageFile = {
  path: string
  dataUrl: string
}

export type FileAccess = {
  supportsNativeFiles: boolean
  openMarkdownFile: () => Promise<OpenedMarkdownFile | null>
  openMarkdownFileAtPath: (path: string) => Promise<OpenedMarkdownFile>
  saveMarkdownFile: (path: string, content: string) => Promise<string>
  saveMarkdownFileAs: (content: string, currentPath: string | null) => Promise<string | null>
  exportHtmlFile: (html: string, currentPath: string | null, title: string) => Promise<string | null>
  printExportHtml: (html: string, title: string) => Promise<void>
  readLocalImageFile: (path: string) => Promise<LocalImageFile>
  readStartupMarkdownFile: () => Promise<OpenedMarkdownFile | null>
  listenForOpenedFiles: (callback: (file: OpenedMarkdownFile) => void) => Promise<UnlistenFn | null>
}

const markdownFilters = [
  {
    name: 'Markdown',
    extensions: ['md', 'markdown', 'mdown', 'mkdn'],
  },
]

const htmlFilters = [
  {
    name: 'HTML',
    extensions: ['html', 'htm'],
  },
]

export const tauriFileAccess: FileAccess = {
  supportsNativeFiles: isTauriRuntime(),

  async openMarkdownFile() {
    if (!isTauriRuntime()) {
      return null
    }

    const selected = await open({
      multiple: false,
      directory: false,
      filters: markdownFilters,
    })
    const path = normalizeDialogPath(selected)

    if (!path) {
      return null
    }

    return readMarkdownFile(path)
  },

  async openMarkdownFileAtPath(path) {
    if (!isTauriRuntime()) {
      throw new Error('Native file opening is only available in the desktop app.')
    }

    return readMarkdownFile(path)
  },

  async saveMarkdownFile(path, content) {
    if (!isTauriRuntime()) {
      throw new Error('Native file saving is only available in the desktop app.')
    }

    await invoke('write_markdown_file', { path, content })
    return path
  },

  async exportHtmlFile(html, currentPath, title) {
    if (!isTauriRuntime()) {
      return null
    }

    const selected = await save({
      defaultPath: createExportHtmlDefaultPath(currentPath, title),
      filters: htmlFilters,
    })

    if (!selected) {
      return null
    }

    const path = ensureHtmlExtension(selected)
    await invoke('write_html_file', { path, content: html })
    return path
  },

  async printExportHtml(html, title) {
    await printHtmlDocument(html, title)
  },

  async readLocalImageFile(path) {
    if (!isTauriRuntime()) {
      throw new Error('Local images are only available in the desktop app.')
    }

    return invoke<LocalImageFile>('read_image_file', { path })
  },

  async saveMarkdownFileAs(content, currentPath) {
    if (!isTauriRuntime()) {
      return null
    }

    const selected = await save({
      defaultPath: currentPath ?? 'Untitled.md',
      filters: markdownFilters,
    })

    if (!selected) {
      return null
    }

    const path = ensureMarkdownExtension(selected)
    await invoke('write_markdown_file', { path, content })
    return path
  },

  async readStartupMarkdownFile() {
    if (!isTauriRuntime()) {
      return null
    }

    const paths = await invoke<string[]>('take_opened_files')
    const path = paths.at(0)
    return path ? readMarkdownFile(path) : null
  },

  async listenForOpenedFiles(callback) {
    if (!isTauriRuntime()) {
      return null
    }

    return listen<string[]>('opened-files', async (event) => {
      const path = event.payload.at(0)
      if (!path) {
        return
      }

      callback(await readMarkdownFile(path))
    })
  },
}

async function readMarkdownFile(path: string): Promise<OpenedMarkdownFile> {
  const content = await invoke<string>('read_markdown_file', { path })
  return { path, content }
}

function normalizeDialogPath(selected: string | string[] | null): string | null {
  if (Array.isArray(selected)) {
    return selected.at(0) ?? null
  }

  return selected
}

function ensureHtmlExtension(path: string): string {
  return isHtmlPath(path) ? path : `${path}.html`
}

function isHtmlPath(path: string): boolean {
  const extension = path.split('.').at(-1)?.toLowerCase()
  return extension !== undefined && extension !== path.toLowerCase() && htmlFilters[0].extensions.includes(extension)
}

async function printHtmlDocument(html: string, title: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Printing is only available in a browser window.')
  }

  const iframe = document.createElement('iframe')
  iframe.title = title
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  document.body.append(iframe)

  try {
    const iframeDocument = iframe.contentDocument ?? iframe.contentWindow?.document
    if (!iframeDocument) {
      throw new Error('Unable to create print document.')
    }

    iframeDocument.open()
    iframeDocument.write(html)
    iframeDocument.close()

    await new Promise<void>((resolve) => window.setTimeout(resolve, 0))

    const iframeWindow = iframe.contentWindow
    if (!iframeWindow) {
      throw new Error('Unable to open print window.')
    }

    iframeWindow.focus()
    iframeWindow.print()
    window.setTimeout(() => iframe.remove(), 1000)
  } catch (error) {
    iframe.remove()
    throw error
  }
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
