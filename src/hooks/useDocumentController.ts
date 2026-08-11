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

type ExternalFileState =
  | { kind: 'conflict'; file: OpenedMarkdownFile }
  | { kind: 'missing'; path: string }

type DocumentViewMode = 'preview' | 'edit'

type UseDocumentControllerOptions = {
  fileAccess: FileAccess
  discardUnsavedMessage: string
  recentFileOpenFailedMessage: string
  fileOperationFailedMessage: string
  draftBackupFailedMessage: string
  externalFileUpdatedMessage: string
  externalFileConflictMessage: string
  externalFileMissingMessage: string
  externalFileSaveBlockedMessage: string
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
  externalFileUpdatedMessage,
  externalFileConflictMessage,
  externalFileMissingMessage,
  externalFileSaveBlockedMessage,
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
  const [externalFileState, setExternalFileState] = useState<ExternalFileState | null>(null)
  const saveOperationRef = useRef<Promise<string | null> | null>(null)
  const documentRef = useRef(markdownDocument)
  const [documentSessionId, setDocumentSessionId] = useState(createDocumentDraftId)
  const sessionIdRef = useRef(documentSessionId)
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
    setDocumentSessionId(id)
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
    setMarkdownDocument((current) => replaceDocumentContent(current, file.content, file.path, file.revision))
    setExternalFileState(null)
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

  const checkCurrentFile = useCallback(async () => {
    const current = documentRef.current
    if (!fileAccess.supportsNativeFiles || !fileAccess.checkMarkdownFile || !current.path || !current.savedRevision) {
      return
    }

    try {
      const result = await fileAccess.checkMarkdownFile(current.path, current.savedRevision)
      const latest = documentRef.current
      if (latest.path !== current.path || latest.savedRevision !== current.savedRevision) {
        return
      }

      if (result.status === 'missing') {
        setExternalFileState({ kind: 'missing', path: result.path })
        setStatusMessage(externalFileMissingMessage)
      } else if (result.status === 'changed') {
        if (latest.isDirty && latest.content !== result.file.content) {
          setExternalFileState({ kind: 'conflict', file: result.file })
          setStatusMessage(externalFileConflictMessage)
        } else {
          setMarkdownDocument((document) => replaceDocumentContent(document, result.file.content, result.file.path, result.file.revision))
          clearCurrentDraft()
          setExternalFileState(null)
          setStatusMessage(externalFileUpdatedMessage)
        }
      }
    } catch {
      // Temporary filesystem failures should not interrupt reading or editing.
    }
  }, [clearCurrentDraft, externalFileConflictMessage, externalFileMissingMessage, externalFileUpdatedMessage, fileAccess])

  useEffect(() => {
    if (!isStartupResolved || !markdownDocument.path || !markdownDocument.savedRevision || !fileAccess.supportsNativeFiles) {
      return
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkCurrentFile()
      }
    }, 2000)
    const onFocus = () => void checkCurrentFile()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkCurrentFile()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [checkCurrentFile, fileAccess.supportsNativeFiles, isStartupResolved, markdownDocument.path, markdownDocument.savedRevision])

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
        const savedResult = isSaveAs
          ? await fileAccess.saveMarkdownFileAs(contentToSave, currentPath)
          : markdownDocument.savedRevision
            ? await fileAccess.saveMarkdownFile(currentPath, contentToSave, markdownDocument.savedRevision)
            : await fileAccess.saveMarkdownFile(currentPath, contentToSave)

        if (typeof savedResult === 'string') {
          clearCurrentDraft()
          setMarkdownDocument((current) => markDocumentSaved(current, savedResult, contentToSave, current.savedRevision))
          setExternalFileState(null)
          setStatusMessage('saved')
          if (isSaveAs) rememberRecentFile(savedResult)
          return savedResult
        }

        const structuredResult = savedResult as Exclude<typeof savedResult, string | null>
        if (structuredResult && ((isSaveAs && 'revision' in structuredResult) || (!isSaveAs && 'status' in structuredResult && (structuredResult as import('../platform/fileAccess').MarkdownFileSaveResult).status === 'saved'))) {
          const completed = structuredResult as { path: string; revision: string }
          const savedPath = completed.path
          const savedRevision = completed.revision
          clearCurrentDraft()
          setMarkdownDocument((current) => markDocumentSaved(current, savedPath, contentToSave, savedRevision))
          setExternalFileState(null)
          setStatusMessage('saved')
          if (isSaveAs) {
            rememberRecentFile(savedPath)
          }
          return savedPath
        }
        if (savedResult && !isSaveAs && 'status' in savedResult) {
          if (savedResult.status === 'conflict') {
            setExternalFileState({ kind: 'conflict', file: savedResult.file })
            setStatusMessage(externalFileSaveBlockedMessage)
          } else if (savedResult.status === 'missing') {
            setExternalFileState({ kind: 'missing', path: savedResult.path })
            setStatusMessage(externalFileMissingMessage)
          }
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
  }, [clearCurrentDraft, externalFileMissingMessage, externalFileSaveBlockedMessage, fileAccess, fileOperationFailedMessage, markdownDocument.content, markdownDocument.path, markdownDocument.savedRevision, rememberRecentFile])

  const handleSaveFile = useCallback(async (): Promise<boolean> => {
    onCloseMenu()
    if (externalFileState) {
      setStatusMessage(externalFileSaveBlockedMessage)
      return false
    }
    return Boolean(await saveDocument())
  }, [externalFileSaveBlockedMessage, externalFileState, onCloseMenu, saveDocument])

  const handleKeepLocalEdits = useCallback(() => {
    if (externalFileState?.kind !== 'conflict') return
    const external = externalFileState.file
    setMarkdownDocument((current) => markDocumentSaved(current, external.path, external.content, external.revision))
    setExternalFileState(null)
    setStatusMessage('unsaved')
  }, [externalFileState])

  const handleReloadDiskVersion = useCallback(() => {
    if (externalFileState?.kind !== 'conflict') return
    const external = externalFileState.file
    clearCurrentDraft()
    setMarkdownDocument((current) => replaceDocumentContent(current, external.content, external.path, external.revision))
    setExternalFileState(null)
    setStatusMessage(externalFileUpdatedMessage)
  }, [clearCurrentDraft, externalFileState, externalFileUpdatedMessage])

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
          replaceDocumentContent(createInitialDocument(), file.content, file.path, file.revision),
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
    documentSessionId,
    externalFileState,
    handleClearRecentFiles,
    handleContentChange,
    handleKeepLocalEdits,
    handleNewDocument,
    handleOpenFile,
    handleOpenRecentFile,
    handleReloadDiskVersion,
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
    retryExternalFile: checkCurrentFile,
    setStatusMessage,
    statusMessage,
    transformDocumentContent,
  }
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage
}
