import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

export type ImageImportProgress = {
  completed: number
  total: number
}

type FailedImageImport = {
  contextKey: string
  files: File[]
}

type UseImageInsertionOptions = {
  content: string
  contextKey: string
  documentPath: string | null
  ensureDocumentPath: () => Promise<string | null>
  fileAccess: FileAccess
  onContentTransform: (transform: (content: string) => string) => void
  onNotify: (message: string) => void
  messages: {
    failed: (count: number) => string
    invalid: string
    partial: (imported: number, failed: number) => string
    success: (count: number) => string
    unsupported: string
  }
}

export function useImageInsertion({
  content,
  contextKey,
  documentPath,
  ensureDocumentPath,
  fileAccess,
  onContentTransform,
  onNotify,
  messages,
}: UseImageInsertionOptions) {
  const [isImportingImages, setIsImportingImages] = useState(false)
  const [progress, setProgress] = useState<ImageImportProgress | null>(null)
  const [failedImport, setFailedImport] = useState<FailedImageImport>({ contextKey, files: [] })
  const importingRef = useRef(false)
  const contextKeyRef = useRef(contextKey)
  const failedFiles = useMemo(
    () => failedImport.contextKey === contextKey ? failedImport.files : [],
    [contextKey, failedImport],
  )

  useEffect(() => {
    contextKeyRef.current = contextKey
  }, [contextKey])

  const runImport = useCallback(async (
    files: File[],
    selection: SelectionRange,
    rejectedCount: number,
  ) => {
    if (importingRef.current || files.length === 0) {
      return
    }

    const batchContextKey = contextKeyRef.current
    importingRef.current = true
    setIsImportingImages(true)

    try {
      const path = documentPath ?? await ensureDocumentPath()
      if (!path || contextKeyRef.current !== batchContextKey) {
        return
      }

      const pendingAssets = createPendingImageAssets(files)
      const placeholders = pendingAssets.map((asset) => asset.placeholder).join('\n')
      onContentTransform((currentContent) => insertAtSelection(
        currentContent,
        content === currentContent ? selection : { start: currentContent.length, end: currentContent.length },
        placeholders,
      ))
      setProgress({ completed: 0, total: pendingAssets.length })

      let importedCount = 0
      const retryableFailures: File[] = []
      for (const [index, asset] of pendingAssets.entries()) {
        const mimeType = getImageAssetMimeType(asset.file)
        if (!mimeType || asset.file.size > MAX_IMAGE_ASSET_SIZE) {
          if (contextKeyRef.current === batchContextKey) {
            onContentTransform((currentContent) => currentContent.replace(asset.placeholder, ''))
          }
          retryableFailures.push(asset.file)
          setProgress({ completed: index + 1, total: pendingAssets.length })
          continue
        }

        try {
          const written = await fileAccess.writeImageAsset(path, {
            bytes: new Uint8Array(await asset.file.arrayBuffer()),
            fileName: asset.file.name,
            mimeType,
          })
          if (contextKeyRef.current === batchContextKey) {
            const markdown = createImageMarkdown(
              getImageAltText(asset.file),
              encodeRelativePath(written.relativePath),
            )
            onContentTransform((currentContent) => currentContent.replace(asset.placeholder, markdown))
            importedCount += 1
          }
        } catch {
          if (contextKeyRef.current === batchContextKey) {
            onContentTransform((currentContent) => currentContent.replace(asset.placeholder, ''))
            retryableFailures.push(asset.file)
          }
        }
        setProgress({ completed: index + 1, total: pendingAssets.length })
      }

      if (contextKeyRef.current !== batchContextKey) {
        return
      }

      if (retryableFailures.length > 0) {
        setFailedImport((currentImport) => ({
          contextKey: batchContextKey,
          files: currentImport.contextKey === batchContextKey
            ? [...currentImport.files, ...retryableFailures]
            : retryableFailures,
        }))
      }
      const failedCount = retryableFailures.length + rejectedCount
      if (importedCount > 0 && failedCount > 0) {
        onNotify(messages.partial(importedCount, failedCount))
      } else if (importedCount > 0) {
        onNotify(messages.success(importedCount))
      } else if (failedCount > 0) {
        onNotify(messages.failed(failedCount))
      }
    } finally {
      importingRef.current = false
      setIsImportingImages(false)
      setProgress(null)
    }
  }, [content, documentPath, ensureDocumentPath, fileAccess, messages, onContentTransform, onNotify])

  const importImages = useCallback(async (files: File[], selection: SelectionRange) => {
    const limitedFiles = files.slice(0, MAX_IMAGE_ASSETS_PER_IMPORT)
    const supportedFiles = limitedFiles.filter(isSupportedImageAsset)
    const rejectedCount = files.length - supportedFiles.length

    if (supportedFiles.length === 0) {
      onNotify(messages.invalid)
      return
    }
    if (!fileAccess.supportsImageImport) {
      onNotify(messages.unsupported)
      return
    }

    await runImport(supportedFiles, selection, rejectedCount)
  }, [fileAccess.supportsImageImport, messages.invalid, messages.unsupported, onNotify, runImport])

  const retryFailedImages = useCallback(async (selection: SelectionRange) => {
    const files = failedFiles
    if (files.length === 0) {
      return
    }

    setFailedImport({ contextKey, files: [] })
    await runImport(files, selection, 0)
  }, [contextKey, failedFiles, runImport])

  const dismissFailedImages = useCallback(() => {
    setFailedImport({ contextKey, files: [] })
  }, [contextKey])

  return {
    dismissFailedImages,
    failedFiles,
    importImages,
    isImportingImages,
    progress,
    retryFailedImages,
  }
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
