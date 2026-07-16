import { describe, expect, it } from 'vitest'
import {
  createImageMarkdown,
  getImageAssetMimeType,
  isSupportedImageAsset,
  MAX_IMAGE_ASSET_SIZE,
} from './imageAssets'

describe('image assets', () => {
  it('accepts supported image types and uses an extension fallback', () => {
    const png = new File(['image'], 'photo.png', { type: 'image/png' })
    const webp = new File(['image'], 'photo.webp', { type: '' })

    expect(isSupportedImageAsset(png)).toBe(true)
    expect(getImageAssetMimeType(webp)).toBe('image/webp')
  })

  it('rejects unsupported and oversized files', () => {
    const svg = new File(['<svg />'], 'icon.svg', { type: 'image/svg+xml' })
    const oversized = new File([new Uint8Array(MAX_IMAGE_ASSET_SIZE + 1)], 'large.png', {
      type: 'image/png',
    })

    expect(isSupportedImageAsset(svg)).toBe(false)
    expect(isSupportedImageAsset(oversized)).toBe(false)
  })

  it('creates standard Markdown image syntax', () => {
    expect(createImageMarkdown('photo', 'assets/photo.png')).toBe('![photo](assets/photo.png)')
  })
})
