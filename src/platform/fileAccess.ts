import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { open, save } from '@tauri-apps/plugin-dialog'
import { ensureMarkdownExtension } from './markdownFiles'

export type OpenedMarkdownFile = {
  path: string
  content: string
}

export type FileAccess = {
  supportsNativeFiles: boolean
  openMarkdownFile: () => Promise<OpenedMarkdownFile | null>
  saveMarkdownFile: (path: string, content: string) => Promise<string>
  saveMarkdownFileAs: (content: string, currentPath: string | null) => Promise<string | null>
  readStartupMarkdownFile: () => Promise<OpenedMarkdownFile | null>
  listenForOpenedFiles: (callback: (file: OpenedMarkdownFile) => void) => Promise<UnlistenFn | null>
}

const markdownFilters = [
  {
    name: 'Markdown',
    extensions: ['md', 'markdown', 'mdown', 'mkdn'],
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

  async saveMarkdownFile(path, content) {
    if (!isTauriRuntime()) {
      throw new Error('Native file saving is only available in the desktop app.')
    }

    await invoke('write_markdown_file', { path, content })
    return path
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

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
