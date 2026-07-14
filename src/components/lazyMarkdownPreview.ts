import { lazy } from 'react'

type MarkdownPreviewModule = typeof import('./MarkdownPreview')

let markdownPreviewModulePromise: Promise<MarkdownPreviewModule> | null = null

function loadMarkdownPreviewModule(): Promise<MarkdownPreviewModule> {
  if (!markdownPreviewModulePromise) {
    markdownPreviewModulePromise = import('./MarkdownPreview')
  }

  return markdownPreviewModulePromise
}

export const LazyMarkdownPreview = lazy(async () => {
  const { MarkdownPreview } = await loadMarkdownPreviewModule()
  return { default: MarkdownPreview }
})

export function preloadMarkdownPreview() {
  void loadMarkdownPreviewModule()
}
