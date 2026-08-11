import { createExportDocxFilename } from '../domain/exportDocxPath'
import { createExportHtmlFilename } from '../domain/exportHtmlPath'
import type {
  FileAccess,
  LocalImageFile,
  MarkdownFileCheck,
  OpenedMarkdownFile,
} from '../platform/fileAccess'

const DATABASE_NAME = 'mdview.edge.files.v1'
const STORE_NAME = 'handles'
const EDGE_FILE_PREFIX = 'edge-file://'
const markdownPickerTypes = [{
  description: 'Markdown files',
  accept: { 'text/markdown': ['.md', '.markdown', '.mdown', '.mkdn', '.mdx'] },
}]

type StoredFileHandle = {
  id: string
  handle: FileSystemFileHandle
}

export const edgeFileAccess: FileAccess = {
  supportsNativeFiles: supportsFileSystemAccess(),
  supportsImageImport: false,
  canRevealFile: false,

  async openMarkdownFile() {
    const [handle] = await showOpenFilePicker({ multiple: false, types: markdownPickerTypes })
    return openHandle(handle)
  },

  async openMarkdownFileAtPath(path) {
    return openHandle(await getHandle(path, true))
  },

  async revealFileInFolder() {
    throw new Error('File location is managed by the browser in the Edge extension.')
  },

  async saveMarkdownFile(path, content, expectedRevision) {
    const handle = await getHandle(path, true)
    const currentFile = await handle.getFile()
    const currentRevision = await createRevision(await currentFile.text())
    if (expectedRevision && currentRevision !== expectedRevision) {
      return {
        status: 'conflict',
        file: await openedFileFromHandle(handle, path, currentFile),
      }
    }

    await writeText(handle, content)
    return { status: 'saved', path, revision: await createRevision(content) }
  },

  async saveMarkdownFileAs(content, currentPath) {
    const handle = await showSaveFilePicker({
      suggestedName: suggestedMarkdownName(currentPath),
      types: markdownPickerTypes,
    })
    await writeText(handle, content)
    const path = await registerHandle(handle)
    return { path, revision: await createRevision(content) }
  },

  async checkMarkdownFile(path, knownRevision): Promise<MarkdownFileCheck> {
    try {
      const handle = await getHandle(path, false)
      const file = await handle.getFile()
      const revision = await createRevision(await file.text())
      return revision === knownRevision
        ? { status: 'unchanged' }
        : { status: 'changed', file: await openedFileFromHandle(handle, path, file) }
    } catch (error) {
      if (isNotFoundError(error)) return { status: 'missing', path }
      throw error
    }
  },

  async exportHtmlFile(html, currentPath, title) {
    const handle = await showSaveFilePicker({
      suggestedName: suggestedExportName(currentPath, title, 'html'),
      types: [{ description: 'HTML file', accept: { 'text/html': ['.html', '.htm'] } }],
    })
    await writeText(handle, html)
    return handle.name
  },

  async exportDocxFile(bytes, currentPath, title) {
    const handle = await showSaveFilePicker({
      suggestedName: suggestedExportName(currentPath, title, 'docx'),
      types: [{ description: 'Word document', accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } }],
    })
    const writable = await handle.createWritable()
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    await writable.write(copy)
    await writable.close()
    return handle.name
  },

  async printExportHtml(html, title) {
    const printWindow = window.open('', '_blank', 'popup,width=900,height=700')
    if (!printWindow) throw new Error('Unable to open print window.')
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.title = title
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  },

  async readLocalImageFile(path): Promise<LocalImageFile> {
    const handle = await getHandle(path, true)
    const file = await handle.getFile()
    return { path, dataUrl: await fileToDataUrl(file) }
  },

  async writeImageAsset() {
    throw new Error('Image import is not yet available in the Edge extension.')
  },

  async readStartupMarkdownFile() {
    const payload = await chrome.storage.session.get('mdviewImportedPage')
    const imported = payload.mdviewImportedPage
    await chrome.storage.session.remove('mdviewImportedPage')
    if (!isImportedPage(imported)) return null
    return {
      path: `edge-page://${imported.id}/${imported.title || 'webpage.md'}`,
      content: imported.content,
      revision: await createRevision(imported.content),
    }
  },

  async listenForOpenedFiles() {
    return null
  },
}

async function openHandle(handle: FileSystemFileHandle): Promise<OpenedMarkdownFile> {
  const path = await registerHandle(handle)
  return openedFileFromHandle(handle, path)
}

async function openedFileFromHandle(
  handle: FileSystemFileHandle,
  path: string,
  existingFile?: File,
): Promise<OpenedMarkdownFile> {
  const file = existingFile ?? await handle.getFile()
  const content = await file.text()
  return { path, content, revision: await createRevision(content) }
}

async function writeText(handle: FileSystemFileHandle, content: string) {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

async function registerHandle(handle: FileSystemFileHandle): Promise<string> {
  const id = crypto.randomUUID()
  await withStore('readwrite', (store) => store.put({ id, handle } satisfies StoredFileHandle))
  return `${EDGE_FILE_PREFIX}${id}/${handle.name}`
}

async function getHandle(path: string, requestPermission: boolean): Promise<FileSystemFileHandle> {
  const id = getHandleId(path)
  const record = await withStore<StoredFileHandle | undefined>('readonly', (store) => store.get(id))
  if (!record?.handle) throw new Error('The browser no longer has access to this file. Please open it again.')

  let permission = await record.handle.queryPermission?.({ mode: 'readwrite' })
  if (permission === 'prompt' && requestPermission) {
    permission = await record.handle.requestPermission?.({ mode: 'readwrite' })
  }
  if (permission === 'denied') throw new Error('File permission was denied. Please open it again.')
  return record.handle
}

function getHandleId(path: string): string {
  if (!path.startsWith(EDGE_FILE_PREFIX)) throw new Error('This file is not available in the Edge extension.')
  const id = path.slice(EDGE_FILE_PREFIX.length).split('/')[0]
  if (!id) throw new Error('Invalid Edge file reference.')
  return id
}

function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const transaction = request.result.transaction(STORE_NAME, mode)
      const operation = action(transaction.objectStore(STORE_NAME))
      operation.onsuccess = () => resolve(operation.result)
      operation.onerror = () => reject(operation.error)
      transaction.oncomplete = () => request.result.close()
    }
  })
}

function supportsFileSystemAccess() {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window && 'showSaveFilePicker' in window
}

function suggestedMarkdownName(currentPath: string | null) {
  return currentPath ? decodeURIComponent(currentPath.split('/').at(-1) ?? 'Untitled.md') : 'Untitled.md'
}

function suggestedExportName(currentPath: string | null, title: string, extension: 'html' | 'docx') {
  if (currentPath?.startsWith(EDGE_FILE_PREFIX)) {
    const sourceName = decodeURIComponent(currentPath.split('/').at(-1) ?? title)
    return sourceName.replace(/\.[^.]+$/, `.${extension}`)
  }
  return extension === 'html' ? createExportHtmlFilename(title) : createExportDocxFilename(title)
}

async function createRevision(content: string) {
  const bytes = new TextEncoder().encode(content)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function isNotFoundError(error: unknown) {
  return error instanceof DOMException && error.name === 'NotFoundError'
}

function isImportedPage(value: unknown): value is { id: string; title: string; content: string } {
  return Boolean(value) && typeof value === 'object' &&
    typeof (value as Record<string, unknown>).id === 'string' &&
    typeof (value as Record<string, unknown>).content === 'string' &&
    typeof (value as Record<string, unknown>).title === 'string'
}
