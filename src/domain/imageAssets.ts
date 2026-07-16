export type PendingImageAsset = {
  id: string
  file: File
  placeholder: string
}

export const MAX_IMAGE_ASSET_SIZE = 10 * 1024 * 1024
export const MAX_IMAGE_ASSETS_PER_IMPORT = 10
export const SUPPORTED_IMAGE_ASSET_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/avif',
])

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function createPendingImageAssets(files: File[]): PendingImageAsset[] {
  return files.slice(0, MAX_IMAGE_ASSETS_PER_IMPORT).map((file, index) => {
    const id = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`
    return {
      id,
      file,
      placeholder: `<!-- mdview-image-import:${id} -->`,
    }
  })
}

export function isSupportedImageAsset(file: File): boolean {
  return getImageAssetMimeType(file) !== null && file.size <= MAX_IMAGE_ASSET_SIZE
}

export function getImageAssetMimeType(file: File): string | null {
  const mimeType = file.type.toLowerCase()
  if (SUPPORTED_IMAGE_ASSET_TYPES.has(mimeType)) {
    return mimeType
  }

  const extension = file.name.split('.').at(-1)?.toLowerCase()
  return extension ? MIME_TYPE_BY_EXTENSION[extension] ?? null : null
}

export function createImageMarkdown(alt: string, relativePath: string): string {
  return `![${alt}](${relativePath})`
}

export function getImageAltText(file: File): string {
  const name = file.name.replace(/\.[^.]+$/, '').trim()
  return name || 'image'
}
