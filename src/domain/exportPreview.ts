import { resolveLocalMarkdownResource } from './localMarkdownResources'
import { renderMermaidDiagram, sanitizeMermaidSvg } from './mermaidRenderer'

const MAX_EMBEDDED_IMAGE_BYTES = 100 * 1024 * 1024

export type EmbeddedExportContent = {
  html: string
  unresolvedResources: string[]
}

type CreateLightExportContentOptions = {
  sourcePath: string | null
  readLocalImageFile: (path: string) => Promise<{ dataUrl: string }>
  readRemoteImageFile?: (url: string) => Promise<{ dataUrl: string }>
}

export async function createLightExportContent(
  previewElement: HTMLElement,
  { sourcePath, readLocalImageFile, readRemoteImageFile }: CreateLightExportContentOptions,
): Promise<EmbeddedExportContent> {
  const previewClone = previewElement.cloneNode(true) as HTMLElement
  const unresolvedResources = new Set<string>()
  let embeddedBytes = 0
  const imageCache = new Map<string, Promise<string>>()
  const diagrams = Array.from(previewClone.querySelectorAll<HTMLElement>('[data-mdview-mermaid-chart]'))

  for (const [index, diagram] of diagrams.entries()) {
    const chart = diagram.dataset.mdviewMermaidChart
    if (!chart) {
      continue
    }

    const result = await renderMermaidDiagram(`mdview-export-mermaid-${index}`, chart, 'light')
    diagram.innerHTML = sanitizeMermaidSvg(result.svg)
    delete diagram.dataset.mdviewMermaidChart
  }

  for (const image of Array.from(previewClone.querySelectorAll<HTMLImageElement>('img'))) {
    const source = image.getAttribute('src')?.trim()
    if (!source || source.startsWith('data:')) {
      continue
    }

    try {
      const dataUrl = await readImageDataUrl(source, sourcePath, readLocalImageFile, readRemoteImageFile, imageCache)
      const nextBytes = estimateDataUrlBytes(dataUrl)
      if (embeddedBytes + nextBytes > MAX_EMBEDDED_IMAGE_BYTES) {
        throw new Error('The export image limit was exceeded.')
      }
      embeddedBytes += nextBytes
      image.setAttribute('src', dataUrl)
    } catch {
      unresolvedResources.add(source)
    }
  }

  previewClone.querySelectorAll<HTMLElement>('.search-match').forEach((match) => {
    match.replaceWith(...Array.from(match.childNodes))
  })
  previewClone.querySelectorAll<HTMLElement>('[data-mdview-source-start]').forEach((element) => {
    delete element.dataset.mdviewSourceStart
    delete element.dataset.mdviewSourceEnd
  })

  return {
    html: previewClone.innerHTML,
    unresolvedResources: [...unresolvedResources],
  }
}

async function readImageDataUrl(
  source: string,
  sourcePath: string | null,
  readLocalImageFile: CreateLightExportContentOptions['readLocalImageFile'],
  readRemoteImageFile: CreateLightExportContentOptions['readRemoteImageFile'],
  imageCache: Map<string, Promise<string>>,
): Promise<string> {
  const existing = imageCache.get(source)
  if (existing) {
    return existing
  }

  const task = (async () => {
    const localResource = resolveLocalMarkdownResource(source, sourcePath)
    if (localResource?.kind === 'image') {
      return (await readLocalImageFile(localResource.path)).dataUrl
    }

    if (!isRemoteImageUrl(source) || !readRemoteImageFile) {
      throw new Error('The image cannot be embedded.')
    }

    return (await readRemoteImageFile(source)).dataUrl
  })()
  imageCache.set(source, task)
  return task
}

function isRemoteImageUrl(source: string): boolean {
  try {
    const url = new URL(source)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex < 0) {
    return dataUrl.length
  }

  const payload = dataUrl.slice(commaIndex + 1)
  return Math.floor((payload.length * 3) / 4)
}
