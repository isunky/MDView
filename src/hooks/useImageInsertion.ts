import { useCallback, useState } from 'react'
import {
  createImageMarkdown,
  createPendingImageAssets,
  getImageAltText,
  getImageAssetMimeType,
  isSupportedImageAsset,
  MAX_IMAGE_ASSETS_PER_IMPORT,
  MAX_IMAGE_ASSET_SIZE,
} from '../domain/imageAssets'
import type { SelectionRange } from '../components/MarkdownEditor'
import type { FileAccess } from '../platform/fileAccess'

type UseImageInsertionOptions = {
  content: string
  documentPath: string | null
  ensureDocumentPath: () => Promise<string | null>
  fileAccess: FileAccess
  onContentTransform: (transform: (content: string) => string) => void
  onNotify: (message: string) => void
  messages: {
    failed: (count: number) => string
    invalid: string
    success: (count: number) => string
    unsupported: string
  }
}

export function useImageInsertion({
  content,
  documentPath,
  ensureDocumentPath,
  fileAccess,
  onContentTransform,
  onNotify,
  messages,
}: UseImageInsertionOptions) {
  const [isImportingImages, setIsImportingImages] = useState(false)

  const importImages = useCallback(async (files: File[], selection: SelectionRange) => {
    const limitedFiles = files.slice(0, MAX_IMAGE_ASSETS_PER_IMPORT)
    const supportedFiles = limitedFiles.filter(isSupportedImageAsset)
    const rejectedCount = files.length - supportedFiles.length

    if (supportedFiles.length === 0) {
      onNotify(messages.invalid)
      return
    }

    if (!fileAccess.supportsNativeFiles) {
      onNotify(messages.unsupported)
      return
    }

    const path = documentPath ?? await ensureDocumentPath()
    if (!path) {
      return
    }

    const pendingAssets = createPendingImageAssets(supportedFiles)
    const placeholders = pendingAssets.map((asset) => asset.placeholder).join('\n')
    onContentTransform((currentContent) => insertAtSelection(
      currentContent,
      content === currentContent ? selection : { start: currentContent.length, end: currentContent.length },
      placeholders,
    ))
    setIsImportingImages(true)

    let importedCount = 0
    let failedCount = 0
    for (const asset of pendingAssets) {
      const mimeType = getImageAssetMimeType(asset.file)
      if (!mimeType || asset.file.size > MAX_IMAGE_ASSET_SIZE) {
        failedCount += 1
        onContentTransform((currentContent) => currentContent.replace(asset.placeholder, ''))
        continue
      }

      try {
        const written = await fileAccess.writeImageAsset(path, {
          bytes: new Uint8Array(await asset.file.arrayBuffer()),
          fileName: asset.file.name,
          mimeType,
        })
        const markdown = createImageMarkdown(
          getImageAltText(asset.file),
          encodeRelativePath(written.relativePath),
        )
        onContentTransform((currentContent) => currentContent.replace(asset.placeholder, markdown))
        importedCount += 1
      } catch {
        onContentTransform((currentContent) => currentContent.replace(asset.placeholder, ''))
        failedCount += 1
      }
    }

    setIsImportingImages(false)
    if (importedCount > 0) {
      onNotify(messages.success(importedCount))
    }
    if (failedCount > 0 || rejectedCount > 0) {
      onNotify(messages.failed(failedCount + rejectedCount))
    }
  }, [
    content,
    documentPath,
    ensureDocumentPath,
    fileAccess,
    onContentTransform,
    onNotify,
    messages,
  ])

  return { importImages, isImportingImages }
}

function insertAtSelection(content: string, selection: SelectionRange, insertion: string): string {
  const start = Math.min(Math.max(selection.start, 0), content.length)
  const end = Math.min(Math.max(selection.end, start), content.length)
  const before = content.slice(0, start)
  const after = content.slice(end)
  const leadingNewline = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
  const trailingNewline = after.length > 0 && !after.startsWith('\n') ? '\n' : ''

  return `${before}${leadingNewline}${insertion}${trailingNewline}${after}`
}

function encodeRelativePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}
