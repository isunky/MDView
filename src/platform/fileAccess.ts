import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { createExportDocxDefaultPath } from '../domain/exportDocxPath'
import { createExportHtmlDefaultPath } from '../domain/exportHtmlPath'

export type OpenedMarkdownFile = {
  path: string
  content: string
  revision?: string
}

export type MarkdownFileCheck =
  | { status: 'unchanged' }
  | { status: 'changed'; file: OpenedMarkdownFile }
  | { status: 'missing'; path: string }

export type MarkdownFileSaveResult =
  | { status: 'saved'; path: string; revision: string }
  | { status: 'conflict'; file: OpenedMarkdownFile }
  | { status: 'missing'; path: string }

export type SavedMarkdownFile = { path: string; revision: string }

export type LocalImageFile = {
  path: string
  dataUrl: string
}

export type WrittenImageAsset = {
  path: string
  relativePath: string
  filename: string
}

export type ImageAssetWriteRequest = {
  bytes: Uint8Array
  fileName: string
  mimeType: string
}

export type FileAccess = {
  supportsNativeFiles: boolean
  canRevealFile?: boolean
  openMarkdownFile: () => Promise<OpenedMarkdownFile | null>
  openMarkdownFileAtPath: (path: string) => Promise<OpenedMarkdownFile>
  revealFileInFolder: (path: string) => Promise<void>
  saveMarkdownFile: (path: string, content: string, expectedRevision?: string) => Promise<MarkdownFileSaveResult | string>
  saveMarkdownFileAs: (content: string, currentPath: string | null) => Promise<SavedMarkdownFile | string | null>
  checkMarkdownFile?: (path: string, knownRevision: string) => Promise<MarkdownFileCheck>
  exportHtmlFile: (html: string, currentPath: string | null, title: string) => Promise<string | null>
  exportDocxFile: (bytes: Uint8Array, currentPath: string | null, title: string) => Promise<string | null>
  printExportHtml: (html: string, title: string) => Promise<void>
  readLocalImageFile: (path: string) => Promise<LocalImageFile>
  readRemoteImageFile?: (url: string) => Promise<LocalImageFile>
  writeImageAsset: (documentPath: string, image: ImageAssetWriteRequest) => Promise<WrittenImageAsset>
  readStartupMarkdownFile: () => Promise<OpenedMarkdownFile | null>
  listenForOpenedFiles: (callback: (file: OpenedMarkdownFile) => void) => Promise<UnlistenFn | null>
}

export const tauriFileAccess: FileAccess = {
  supportsNativeFiles: isTauriRuntime(),
  canRevealFile: isTauriRuntime(),

  async openMarkdownFile() {
    if (!isTauriRuntime()) {
      return null
    }

    return invoke<OpenedMarkdownFile | null>('open_markdown_file_dialog')
  },

  async openMarkdownFileAtPath(path) {
    if (!isTauriRuntime()) {
      throw new Error('Native file opening is only available in the desktop app.')
    }

    return invoke<OpenedMarkdownFile>('open_markdown_file_at_path', { path })
  },

  async revealFileInFolder(path) {
    if (!isTauriRuntime()) {
      throw new Error('Revealing files is only available in the desktop app.')
    }

    await invoke('reveal_file_in_folder', { path })
  },

  async saveMarkdownFile(path, content, expectedRevision) {
    if (!isTauriRuntime()) {
      throw new Error('Native file saving is only available in the desktop app.')
    }

    return invoke<MarkdownFileSaveResult>('save_markdown_file', { path, content, expectedRevision })
  },

  async exportHtmlFile(html, currentPath, title) {
    if (!isTauriRuntime()) {
      return null
    }

    return invoke<string | null>('export_html_file_dialog', {
      content: html,
      defaultPath: createExportHtmlDefaultPath(currentPath, title),
    })
  },

  async exportDocxFile(bytes, currentPath, title) {
    if (!isTauriRuntime()) {
      return null
    }

    return invoke<string | null>('export_docx_file_dialog', {
      bytes: Array.from(bytes),
      defaultPath: createExportDocxDefaultPath(currentPath, title),
    })
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

  async readRemoteImageFile(url) {
    if (!isTauriRuntime()) {
      throw new Error('Remote images are only available in the desktop app.')
    }

    return invoke<LocalImageFile>('read_remote_image_file', { url })
  },

  async writeImageAsset(documentPath, image) {
    if (!isTauriRuntime()) {
      throw new Error('Image import is only available in the desktop app.')
    }

    return invoke<WrittenImageAsset>('write_image_asset', {
      documentPath,
      fileName: image.fileName,
      mimeType: image.mimeType,
      bytes: Array.from(image.bytes),
    })
  },

  async saveMarkdownFileAs(content, currentPath) {
    if (!isTauriRuntime()) {
      return null
    }

    return invoke<SavedMarkdownFile | null>('save_markdown_file_dialog', {
      content,
      defaultPath: currentPath ?? 'Untitled.md',
    })
  },

  async checkMarkdownFile(path, knownRevision) {
    if (!isTauriRuntime()) {
      return { status: 'unchanged' }
    }

    return invoke<MarkdownFileCheck>('check_markdown_file', { path, knownRevision })
  },

  async readStartupMarkdownFile() {
    if (!isTauriRuntime()) {
      return null
    }

    const paths = await invoke<string[]>('take_opened_files')
    const path = paths.at(0)
    return path ? invoke<OpenedMarkdownFile>('open_markdown_file_at_path', { path }) : null
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

      callback(await invoke<OpenedMarkdownFile>('open_markdown_file_at_path', { path }))
    })
  },
}

async function printHtmlDocument(html: string, title: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Printing is only available in a browser window.')
  }

  if (isTauriRuntime()) {
    await printHtmlInTauriWindow(html, title)
    return
  }

  const printWindow = window.open('', '_blank', 'popup,width=900,height=700')
  if (!printWindow) {
    throw new Error('Unable to open print window.')
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

async function printHtmlInTauriWindow(html: string, title: string) {
  const label = `pdf-export-${Date.now()}`
  const printWindow = new WebviewWindow(label, {
    title,
    url: createHtmlDataUrl(html),
    width: 900,
    height: 700,
    center: true,
    resizable: true,
    focus: true,
  })

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Unable to open print window.')), 5000)

    printWindow.once('tauri://created', () => {
      window.clearTimeout(timeout)
      resolve()
    })
    printWindow.once('tauri://error', (event) => {
      window.clearTimeout(timeout)
      reject(new Error(String(event.payload)))
    })
  })

  await new Promise<void>((resolve) => window.setTimeout(resolve, 500))
  await invoke('plugin:webview|print', { label })
}

function createHtmlDataUrl(html: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
