import { useCallback, useRef, useState, type RefObject } from 'react'
import { getLanguageLocale, type Translation, type AppLanguage } from '../i18n'
import type { FileAccess } from '../platform/fileAccess'

type ExportDocument = { content: string; path: string | null; title: string }

export function useDocumentExport({
  closeMenu,
  preparePreview,
  document,
  fileAccess,
  language,
  previewRef,
  setStatusMessage,
  t,
}: {
  closeMenu: () => void
  preparePreview?: () => void
  document: ExportDocument
  fileAccess: FileAccess
  language: AppLanguage
  previewRef: RefObject<HTMLElement | null>
  setStatusMessage: (message: string) => void
  t: Translation
}) {
  const busyRef = useRef(false)
  const [isExporting, setIsExporting] = useState(false)
  const [lastExportPath, setLastExportPath] = useState<string | null>(null)
  const [isWordWarningOpen, setIsWordWarningOpen] = useState(false)
  const begin = useCallback(() => {
    if (busyRef.current) return false
    busyRef.current = true
    setIsExporting(true)
    setLastExportPath(null)
    return true
  }, [])
  const finish = useCallback(() => { busyRef.current = false; setIsExporting(false) }, [])
  const buildCurrentExportHtml = useCallback(async () => {
    preparePreview?.()
    const previewElement = previewRef.current
    if (!previewElement) throw new Error(t.exportPreviewUnavailable)

    const [{ buildExportHtml }, { createLightExportContent }] = await Promise.all([
      import('../domain/exportHtml'),
      import('../domain/exportPreview'),
    ])
    const content = await createLightExportContent(previewElement, {
      sourcePath: document.path,
      readLocalImageFile: fileAccess.readLocalImageFile,
      readRemoteImageFile: fileAccess.readRemoteImageFile,
    })
    const mathStyles = content.html.includes('class="katex')
      ? (await import('../domain/mathExportAssets')).getEmbeddedKatexStyles()
      : ''
    return {
      unresolvedResources: content.unresolvedResources,
      html: buildExportHtml({
        title: document.title,
        lang: getLanguageLocale(language),
        contentHtml: content.html,
        mathStyles,
      }),
    }
  }, [document.path, document.title, fileAccess, language, preparePreview, previewRef, t.exportPreviewUnavailable])

  const exportHtml = useCallback(async () => {
    if (!begin()) return
    closeMenu()
    setStatusMessage(t.exportHtmlPreparing)
    try {
      const { html, unresolvedResources } = await buildCurrentExportHtml()
      const savedPath = await fileAccess.exportHtmlFile(html, document.path, document.title)
      setLastExportPath(savedPath)
      setStatusMessage(savedPath
        ? unresolvedResources.length > 0 ? t.exportHtmlSavedWithWarnings(unresolvedResources.length) : t.exportHtmlSaved
        : t.exportCanceled)
    } catch (error) { setStatusMessage(getErrorMessage(error, t.fileOperationFailed)) } finally { finish() }
  }, [begin, finish, buildCurrentExportHtml, closeMenu, document.path, document.title, fileAccess, setStatusMessage, t])

  const exportPdf = useCallback(async () => {
    if (!begin()) return
    closeMenu()
    setStatusMessage(t.exportPdfPreparing)
    try {
      const { html, unresolvedResources } = await buildCurrentExportHtml()
      await fileAccess.printExportHtml(html, document.title)
      setStatusMessage(unresolvedResources.length > 0 ? t.printDialogOpenedWithWarnings(unresolvedResources.length) : t.printDialogOpened)
    } catch (error) { setStatusMessage(getErrorMessage(error, t.fileOperationFailed)) } finally { finish() }
  }, [begin, finish, buildCurrentExportHtml, closeMenu, document.title, fileAccess, setStatusMessage, t])

  const performDocxExport = useCallback(async () => {
    if (!begin()) return
    closeMenu()
    setStatusMessage(t.exportDocxPreparing)
    try {
      const { buildExportDocx } = await import('../domain/exportDocx')
      const result = await buildExportDocx({
        title: document.title,
        content: document.content,
        sourcePath: document.path,
        readLocalImageFile: fileAccess.readLocalImageFile,
      })
      const savedPath = await fileAccess.exportDocxFile(result.bytes, document.path, document.title)
      setLastExportPath(savedPath)
      setStatusMessage(savedPath
        ? result.formulaImageFallbacks + result.formulaTextFallbacks > 0
          ? t.exportDocxSavedWithFormulaFallbacks(result.formulaImageFallbacks, result.formulaTextFallbacks)
          : t.exportDocxSaved
        : t.exportCanceled)
    } catch (error) { setStatusMessage(getErrorMessage(error, t.fileOperationFailed)) } finally { finish() }
  }, [begin, finish, closeMenu, document, fileAccess, setStatusMessage, t])

  const exportDocx = useCallback(async () => {
    if (busyRef.current) return
    if (/^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*mermaid(?:\s|$)/im.test(document.content)) {
      closeMenu()
      setIsWordWarningOpen(true)
      return
    }
    await performDocxExport()
  }, [closeMenu, document.content, performDocxExport])
  return { exportDocx, exportHtml, exportPdf, isExporting, lastExportPath, isWordWarningOpen,
    dismissWordWarning: () => setIsWordWarningOpen(false),
    confirmWordExport: async () => { setIsWordWarningOpen(false); await performDocxExport() },
    exportHtmlInstead: async () => { setIsWordWarningOpen(false); await exportHtml() },
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
