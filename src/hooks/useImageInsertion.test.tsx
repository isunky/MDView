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
      contextKey: 'document-1',
      documentPath: null,
      ensureDocumentPath,
      fileAccess: {
        supportsNativeFiles: true,
        supportsImageImport: true,
        writeImageAsset,
      } as never,
      onContentTransform,
      onNotify,
      messages: {
        failed: (count) => `${count} failed`,
        invalid: 'invalid',
        partial: (imported, failed) => `${imported} added, ${failed} failed`,
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

  it('keeps failed files available for retry and inserts them after a successful retry', async () => {
    let currentContent = '# Notes'
    const writeImageAsset = vi.fn()
      .mockResolvedValueOnce({
        path: '/docs/assets/first.png',
        relativePath: 'assets/first.png',
        filename: 'first.png',
      })
      .mockRejectedValueOnce(new Error('disk busy'))
      .mockResolvedValueOnce({
        path: '/docs/assets/second.png',
        relativePath: 'assets/second.png',
        filename: 'second.png',
      })
    const onContentTransform = vi.fn((transform: (content: string) => string) => {
      currentContent = transform(currentContent)
    })
    const onNotify = vi.fn()
    const { result, rerender } = renderHook(
      ({ content }) => useImageInsertion({
        content,
        contextKey: 'document-1',
        documentPath: '/docs/notes.md',
        ensureDocumentPath: vi.fn(async () => '/docs/notes.md'),
        fileAccess: {
          supportsNativeFiles: true,
          supportsImageImport: true,
          writeImageAsset,
        } as never,
        onContentTransform,
        onNotify,
        messages: {
          failed: (count) => `${count} failed`,
          invalid: 'invalid',
          partial: (imported, failed) => `${imported} added, ${failed} failed`,
          success: (count) => `${count} added`,
          unsupported: 'unsupported',
        },
      }),
      { initialProps: { content: currentContent } },
    )
    const first = new File(['first'], 'first.png', { type: 'image/png' })
    const second = new File(['second'], 'second.png', { type: 'image/png' })

    await act(async () => {
      await result.current.importImages([first, second], { start: 7, end: 7 })
    })

    expect(result.current.failedFiles).toEqual([second])
    expect(onNotify).toHaveBeenLastCalledWith('1 added, 1 failed')

    rerender({ content: currentContent })
    await act(async () => {
      await result.current.retryFailedImages({ start: currentContent.length, end: currentContent.length })
    })

    expect(result.current.failedFiles).toEqual([])
    expect(currentContent).toContain('![first](assets/first.png)')
    expect(currentContent).toContain('![second](assets/second.png)')
  })
})
