interface ChromeStorageArea {
  get(keys?: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(keys: string | string[]): Promise<void>
}

interface ChromeApi {
  action: {
    onClicked: { addListener(listener: (tab: { id?: number; url?: string }) => void): void }
  }
  contextMenus: {
    create(properties: { id: string; title: string; contexts: string[] }): void
    onClicked: {
      addListener(listener: (info: unknown, tab?: { id?: number; url?: string }) => void): void
    }
  }
  runtime: {
    getURL(path: string): string
    onInstalled: { addListener(listener: () => void): void }
  }
  tabs: { create(properties: { url: string }): Promise<unknown> }
  permissions: {
    request(permissions: { origins: string[] }): Promise<boolean>
  }
  scripting: {
    executeScript(details: {
      target: { tabId: number }
      func: () => unknown
    }): Promise<Array<{ result?: unknown }>>
  }
  storage: { session: ChromeStorageArea }
}

declare const chrome: ChromeApi

type FilePickerAcceptType = {
  description?: string
  accept: Record<string, string[]>
}

type FilePickerOptions = {
  multiple?: boolean
  suggestedName?: string
  types?: FilePickerAcceptType[]
}

interface FileSystemFileHandle {
  queryPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
}

declare function showOpenFilePicker(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>
declare function showSaveFilePicker(options?: FilePickerOptions): Promise<FileSystemFileHandle>
