import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createInitialDocument,
  markDocumentSaved,
  replaceDocumentContent,
  updateDocumentDraft,
} from '../domain/documentState'
import {
  addRecentFile,
  clearRecentFiles,
  loadRecentFiles,
  removeRecentFile,
  saveRecentFiles,
} from '../domain/recentFiles'
import type { FileAccess, OpenedMarkdownFile } from '../platform/fileAccess'

type DocumentViewMode = 'preview' | 'edit'

type UseDocumentControllerOptions = {
  fileAccess: FileAccess
  discardUnsavedMessage: string
  recentFileOpenFailedMessage: string
  fileOperationFailedMessage: string
  onCloseMenu: () => void
  onViewModeChange: (mode: DocumentViewMode) => void
}

export function useDocumentController({
  fileAccess,
  discardUnsavedMessage,
  recentFileOpenFailedMessage,
  fileOperationFailedMessage,
  onCloseMenu,
  onViewModeChange,
}: UseDocumentControllerOptions) {
  const [markdownDocument, setMarkdownDocument] = useState(createInitialDocument)
  const [statusMessage, setStatusMessage] = useState<'saved' | 'opened' | string>('saved')
  const [recentFiles, setRecentFiles] = useState(loadRecentFiles)
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const saveOperationRef = useRef<Promise<string | null> | null>(null)

  const canDiscardUnsavedChanges = useCallback((): boolean => {
    return !markdownDocument.isDirty || window.confirm(discardUnsavedMessage)
  }, [discardUnsavedMessage, markdownDocument.isDirty])

  const rememberRecentFile = useCallback((path: string) => {
    setRecentFiles((currentFiles) => {
      const nextFiles = addRecentFile(currentFiles, path)
      saveRecentFiles(nextFiles)
      return nextFiles
    })
  }, [])

  const forgetRecentFile = useCallback((path: string) => {
    setRecentFiles((currentFiles) => {
      const nextFiles = removeRecentFile(currentFiles, path)
      saveRecentFiles(nextFiles)
      return nextFiles
    })
  }, [])

  const loadFile = useCallback((file: OpenedMarkdownFile) => {
    setMarkdownDocument((current) => replaceDocumentContent(current, file.content, file.path))
    setIsWelcomeVisible(false)
    onViewModeChange('preview')
    setStatusMessage('opened')
    rememberRecentFile(file.path)
  }, [onViewModeChange, rememberRecentFile])

  useEffect(() => {
    void fileAccess.readStartupMarkdownFile().then((file) => {
      if (file) {
        loadFile(file)
      }
    })

    let disposed = false
    let unlisten: (() => void) | null = null

    void fileAccess.listenForOpenedFiles(loadFile).then((dispose) => {
      if (disposed) {
        dispose?.()
        return
      }

      unlisten = dispose
    })

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [fileAccess, loadFile])

  useEffect(() => {
    window.document.title = `${markdownDocument.isDirty ? '* ' : ''}${markdownDocument.title} - MDView`
  }, [markdownDocument.isDirty, markdownDocument.title])

  const handleNewDocument = useCallback(() => {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    onCloseMenu()
    setIsWelcomeVisible(false)
    setMarkdownDocument(createInitialDocument())
    onViewModeChange('edit')
    setStatusMessage('saved')
  }, [canDiscardUnsavedChanges, onCloseMenu, onViewModeChange])

  const handleOpenFile = useCallback(async () => {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    onCloseMenu()

    try {
      const file = await fileAccess.openMarkdownFile()
      if (file) {
        loadFile(file)
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error, fileOperationFailedMessage))
    }
  }, [
    canDiscardUnsavedChanges,
    fileAccess,
    fileOperationFailedMessage,
    loadFile,
    onCloseMenu,
  ])

  const handleOpenRecentFile = useCallback(async (path: string) => {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    onCloseMenu()

    try {
      loadFile(await fileAccess.openMarkdownFileAtPath(path))
    } catch {
      forgetRecentFile(path)
      setStatusMessage(recentFileOpenFailedMessage)
    }
  }, [
    canDiscardUnsavedChanges,
    fileAccess,
    forgetRecentFile,
    loadFile,
    onCloseMenu,
    recentFileOpenFailedMessage,
  ])

  const openMarkdownLinkFile = useCallback(async (path: string): Promise<boolean> => {
    if (!canDiscardUnsavedChanges()) {
      return false
    }

    try {
      loadFile(await fileAccess.openMarkdownFileAtPath(path))
      return true
    } catch (error) {
      setStatusMessage(getErrorMessage(error, fileOperationFailedMessage))
      return false
    }
  }, [canDiscardUnsavedChanges, fileAccess, fileOperationFailedMessage, loadFile])

  const saveDocument = useCallback((forceSaveAs = false): Promise<string | null> => {
    const existingOperation = saveOperationRef.current
    if (existingOperation && !forceSaveAs) {
      return existingOperation
    }

    const runSave = async (): Promise<string | null> => {
      try {
        const currentPath = markdownDocument.path
        const contentToSave = markdownDocument.content
        const isSaveAs = forceSaveAs || !currentPath
        const savedPath = isSaveAs
          ? await fileAccess.saveMarkdownFileAs(contentToSave, currentPath)
          : await fileAccess.saveMarkdownFile(currentPath, contentToSave)

        if (savedPath) {
          setMarkdownDocument((current) => markDocumentSaved(current, savedPath, contentToSave))
          setStatusMessage('saved')
          if (isSaveAs) {
            rememberRecentFile(savedPath)
          }
          return savedPath
        }
      } catch (error) {
        setStatusMessage(getErrorMessage(error, fileOperationFailedMessage))
      }

      return null
    }

    const operation = existingOperation
      ? existingOperation.then(() => runSave())
      : runSave()
    saveOperationRef.current = operation
    setIsSaving(true)
    void operation.finally(() => {
      if (saveOperationRef.current === operation) {
        saveOperationRef.current = null
        setIsSaving(false)
      }
    })
    return operation
  }, [
    fileAccess,
    fileOperationFailedMessage,
    markdownDocument.content,
    markdownDocument.path,
    rememberRecentFile,
  ])

  const handleSaveFile = useCallback(async (): Promise<boolean> => {
    onCloseMenu()
    return Boolean(await saveDocument())
  }, [onCloseMenu, saveDocument])

  const handleSaveFileAs = useCallback(async () => {
    onCloseMenu()
    await saveDocument(true)
  }, [onCloseMenu, saveDocument])

  const ensureDocumentPath = useCallback(async (): Promise<string | null> => {
    return markdownDocument.path ?? saveDocument(true)
  }, [markdownDocument.path, saveDocument])

  const handleContentChange = useCallback((content: string) => {
    setIsWelcomeVisible(false)
    setMarkdownDocument((current) => {
      const nextDocument = updateDocumentDraft(current, content)
      setStatusMessage(nextDocument.isDirty ? 'unsaved' : 'saved')
      return nextDocument
    })
  }, [])

  const transformDocumentContent = useCallback((transform: (content: string) => string) => {
    setIsWelcomeVisible(false)
    setMarkdownDocument((current) => {
      const nextDocument = updateDocumentDraft(current, transform(current.content))
      setStatusMessage(nextDocument.isDirty ? 'unsaved' : 'saved')
      return nextDocument
    })
  }, [])

  const handleClearRecentFiles = useCallback(() => {
    clearRecentFiles()
    setRecentFiles([])
    onCloseMenu()
  }, [onCloseMenu])

  return {
    handleClearRecentFiles,
    handleContentChange,
    handleNewDocument,
    handleOpenFile,
    handleOpenRecentFile,
    handleSaveFile,
    handleSaveFileAs,
    ensureDocumentPath,
    isSaving,
    isWelcomeVisible,
    markdownDocument,
    openMarkdownLinkFile,
    recentFiles,
    setStatusMessage,
    statusMessage,
    transformDocumentContent,
  }
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage
}
