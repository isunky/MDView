import { openUrl } from '@tauri-apps/plugin-opener'

export type OpenExternalLink = (url: string) => Promise<void> | void

export function isExternalWebUrl(href: string | undefined): href is string {
  if (!href) {
    return false
  }

  try {
    const url = new URL(href)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export async function openExternalLink(url: string): Promise<void> {
  if (!isExternalWebUrl(url)) {
    throw new Error('Only HTTP and HTTPS links can be opened externally.')
  }

  if (isTauriRuntime()) {
    await openUrl(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
