import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearDocumentDraft,
  createDocumentDraftId,
  loadDocumentDraft,
  saveDocumentDraft,
  type RecoverableDraft,
} from '../domain/documentDraft'
import {
  createInitialDocument,
  markDocumentSaved,
  replaceDocumentContent,
  updateDocumentDraft,
  type MarkdownDocument,
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
  draftBackupFailedMessage: string
  onCloseMenu: () => void
  onViewModeChange: (mode: DocumentViewMode) => void
}

const DRAFT_SAVE_DELAY_MS = 750

export function useDocumentController({
  fileAccess,
  discardUnsavedMessage,
  recentFileOpenFailedMessage,
  fileOperationFailedMessage,
  draftBackupFailedMessage,
  onCloseMenu,
  onViewModeChange,
}: UseDocumentControllerOptions) {
  const [markdownDocument, setMarkdownDocument] = useState(createInitialDocument)
  const [statusMessage, setStatusMessage] = useState<'saved' | 'opened' | string>('saved')
  const [recentFiles, setRecentFiles] = useState(loadRecentFiles)
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<RecoverableDraft | null>(loadDocumentDraft)
  const [isStartupResolved, setIsStartupResolved] = useState(false)
  const saveOperationRef = useRef<Promise<string | null> | null>(null)
  const documentRef = useRef(markdownDocument)
  const sessionIdRef = useRef(createDocumentDraftId())
  const backupFailureNotifiedRef = useRef(false)

  useEffect(() => {
    documentRef.current = markdownDocument
  }, [markdownDocument])

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

  const startDraftSession = useCallback((id = createDocumentDraftId()) => {
    sessionIdRef.current = id
    backupFailureNotifiedRef.current = false
  }, [])

  const clearCurrentDraft = useCallback(() => {
    clearDocumentDraft(sessionIdRef.current)
  }, [])

  const loadFile = useCallback((file: OpenedMarkdownFile, discardCurrentDraft = false) => {
    if (discardCurrentDraft) {
      clearCurrentDraft()
    }

    startDraftSession()
    setMarkdownDocument((current) => replaceDocumentContent(current, file.content, file.path))
    setIsWelcomeVisible(false)
    onViewModeChange('preview')
    setStatusMessage('opened')
    rememberRecentFile(file.path)
  }, [clearCurrentDraft, onViewModeChange, rememberRecentFile, startDraftSession])

  const persistCurrentDraft = useCallback(() => {
    const document = documentRef.current
    if (!isStartupResolved || pendingDraft || !document.isDirty) {
      return
    }

    const saved = saveDocumentDraft({
      id: sessionIdRef.current,
      path: document.path,
      title: document.title,
      content: document.content,
      updatedAt: Date.now(),
    })

    if (!saved && !backupFailureNotifiedRef.current) {
      backupFailureNotifiedRef.current = true
      setStatusMessage(draftBackupFailedMessage)
    }
  }, [draftBackupFailedMessage, isStartupResolved, pendingDraft])

  useEffect(() => {
    let disposed = false
    let unlisten: (() => void) | null = null

    async function initialize() {
      try {
        const startupFile = await fileAccess.readStartupMarkdownFile()
        if (!disposed && startupFile) {
          // A file explicitly passed by the operating system takes priority over an older draft.
          loadFile(startupFile)
          setPendingDraft(null)
        }
      } finally {
        if (!disposed) {
          setIsStartupResolved(true)
        }
      }

      const dispose = await fileAccess.listenForOpenedFiles((file) => loadFile(file, true))
      if (disposed) {
        dispose?.()
        return
      }

      unlisten = dispose
    }

    void initialize()

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [fileAccess, loadFile])

  useEffect(() => {
    window.document.title = `${markdownDocument.isDirty ? '* ' : ''}${markdownDocument.title} - MDView`
  }, [markdownDocument.isDirty, markdownDocument.title])

  useEffect(() => {
    if (!isStartupResolved || pendingDraft || !markdownDocument.isDirty) {
      return
    }

    const timeout = window.setTimeout(persistCurrentDraft, DRAFT_SAVE_DELAY_MS)
    return () => window.clearTimeout(timeout)
  }, [isStartupResolved, markdownDocument.content, markdownDocument.isDirty, pendingDraft, persistCurrentDraft])

  useEffect(() => {
    function flushDraft() {
      persistCurrentDraft()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        flushDraft()
      }
    }

    window.addEventListener('pagehide', flushDraft)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flushDraft)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      flushDraft()
    }
  }, [persistCurrentDraft])

  const handleNewDocument = useCallback(() => {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    onCloseMenu()
    clearCurrentDraft()
    startDraftSession()
    setIsWelcomeVisible(false)
    setMarkdownDocument(createInitialDocument())
    onViewModeChange('edit')
    setStatusMessage('saved')
  }, [canDiscardUnsavedChanges, clearCurrentDraft, onCloseMenu, onViewModeChange, startDraftSession])

  const handleOpenFile = useCallback(async () => {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    onCloseMenu()

    try {
      const file = await fileAccess.openMarkdownFile()
      if (file) {
        loadFile(file, true)
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error, fileOperationFailedMessage))
    }
  }, [canDiscardUnsavedChanges, fileAccess, fileOperationFailedMessage, loadFile, onCloseMenu])

  const handleOpenRecentFile = useCallback(async (path: string) => {
    if (!canDiscardUnsavedChanges()) {
      return
    }

    onCloseMenu()

    try {
      loadFile(await fileAccess.openMarkdownFileAtPath(path), true)
    } catch {
      forgetRecentFile(path)
      setStatusMessage(recentFileOpenFailedMessage)
    }
  }, [canDiscardUnsavedChanges, fileAccess, forgetRecentFile, loadFile, onCloseMenu, recentFileOpenFailedMessage])

  const openMarkdownLinkFile = useCallback(async (path: string): Promise<boolean> => {
    if (!canDiscardUnsavedChanges()) {
      return false
    }

    try {
      loadFile(await fileAccess.openMarkdownFileAtPath(path), true)
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
          clearCurrentDraft()
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
  }, [clearCurrentDraft, fileAccess, fileOperationFailedMessage, markdownDocument.content, markdownDocument.path, rememberRecentFile])

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

  const restorePendingDraft = useCallback(async () => {
    const draft = pendingDraft
    if (!draft) {
      return
    }

    setPendingDraft(null)
    startDraftSession(draft.id)

    let restoredDocument: MarkdownDocument
    if (draft.path) {
      try {
        const file = await fileAccess.openMarkdownFileAtPath(draft.path)
        restoredDocument = updateDocumentDraft(
          replaceDocumentContent(createInitialDocument(), file.content, file.path),
          draft.content,
        )
        rememberRecentFile(file.path)
      } catch {
        restoredDocument = updateDocumentDraft(createInitialDocument(), draft.content)
      }
    } else {
      restoredDocument = updateDocumentDraft(createInitialDocument(), draft.content)
    }

    setMarkdownDocument(restoredDocument)
    setIsWelcomeVisible(false)
    onViewModeChange('edit')
    setStatusMessage(restoredDocument.isDirty ? 'unsaved' : 'saved')
    if (!restoredDocument.isDirty) {
      clearCurrentDraft()
    }
  }, [clearCurrentDraft, fileAccess, onViewModeChange, pendingDraft, rememberRecentFile, startDraftSession])

  const discardPendingDraft = useCallback(() => {
    if (!pendingDraft) {
      return
    }

    clearDocumentDraft(pendingDraft.id)
    startDraftSession()
    setPendingDraft(null)
  }, [pendingDraft, startDraftSession])

  const handleClearRecentFiles = useCallback(() => {
    clearRecentFiles()
    setRecentFiles([])
    onCloseMenu()
  }, [onCloseMenu])

  return {
    discardPendingDraft,
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
    pendingDraft: isStartupResolved ? pendingDraft : null,
    recentFiles,
    restorePendingDraft,
    setStatusMessage,
    statusMessage,
    transformDocumentContent,
  }
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage
}
