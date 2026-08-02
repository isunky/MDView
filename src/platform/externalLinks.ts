export type OpenExternalLink = (url: string) => Promise<void> | void

declare global {
  interface Window {
    __MDVIEW_OPEN_EXTERNAL_LINK__?: OpenExternalLink
  }
}

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

  if (window.__MDVIEW_OPEN_EXTERNAL_LINK__) {
    await window.__MDVIEW_OPEN_EXTERNAL_LINK__(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
