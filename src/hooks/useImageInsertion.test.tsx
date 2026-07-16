import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useImageInsertion } from './useImageInsertion'

describe('useImageInsertion', () => {
  it('saves a pasted image beside the document and inserts a relative Markdown image', async () => {
    let currentContent = '# Notes'
    const ensureDocumentPath = vi.fn(async () => '/docs/notes.md')
    const writeImageAsset = vi.fn(async () => ({
      path: '/docs/assets/diagram.png',
      relativePath: 'assets/diagram.png',
      filename: 'diagram.png',
    }))
    const onContentTransform = vi.fn((transform: (content: string) => string) => {
      currentContent = transform(currentContent)
    })
    const onNotify = vi.fn()
    const { result } = renderHook(() => useImageInsertion({
      content: '# Notes',
      documentPath: null,
      ensureDocumentPath,
      fileAccess: {
        supportsNativeFiles: true,
        writeImageAsset,
      } as never,
      onContentTransform,
      onNotify,
      messages: {
        failed: (count) => `${count} failed`,
        invalid: 'invalid',
        success: (count) => `${count} added`,
        unsupported: 'unsupported',
      },
    }))
    const image = new File(['image-data'], 'diagram.png', { type: 'image/png' })

    await act(async () => {
      await result.current.importImages([image], { start: 7, end: 7 })
    })

    expect(ensureDocumentPath).toHaveBeenCalledTimes(1)
    expect(writeImageAsset).toHaveBeenCalledWith('/docs/notes.md', expect.objectContaining({
      fileName: 'diagram.png',
      mimeType: 'image/png',
    }))
    expect(currentContent).toBe('# Notes\n![diagram](assets/diagram.png)')
    expect(onNotify).toHaveBeenCalledWith('1 added')
  })
})
