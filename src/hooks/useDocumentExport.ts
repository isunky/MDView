import { useCallback, type RefObject } from 'react'
import type { Translation, AppLanguage } from '../i18n'
import type { FileAccess } from '../platform/fileAccess'

type ExportDocument = { content: string; path: string | null; title: string }

export function useDocumentExport({
  closeMenu,
  document,
  fileAccess,
  language,
  previewRef,
  setStatusMessage,
  t,
}: {
  closeMenu: () => void
  document: ExportDocument
  fileAccess: FileAccess
  language: AppLanguage
  previewRef: RefObject<HTMLElement | null>
  setStatusMessage: (message: string) => void
  t: Translation
}) {
  const buildCurrentExportHtml = useCallback(async () => {
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
        lang: language === 'zh' ? 'zh-CN' : 'en',
        contentHtml: content.html,
        mathStyles,
      }),
    }
  }, [document.path, document.title, fileAccess, language, previewRef, t.exportPreviewUnavailable])

  const exportHtml = useCallback(async () => {
    closeMenu()
    setStatusMessage(t.exportHtmlPreparing)
    try {
      const { html, unresolvedResources } = await buildCurrentExportHtml()
      const savedPath = await fileAccess.exportHtmlFile(html, document.path, document.title)
      setStatusMessage(savedPath
        ? unresolvedResources.length > 0 ? t.exportHtmlSavedWithWarnings(unresolvedResources.length) : t.exportHtmlSaved
        : t.exportCanceled)
    } catch (error) { setStatusMessage(getErrorMessage(error, t.fileOperationFailed)) }
  }, [buildCurrentExportHtml, closeMenu, document.path, document.title, fileAccess, setStatusMessage, t])

  const exportPdf = useCallback(async () => {
    closeMenu()
    try {
      const { html, unresolvedResources } = await buildCurrentExportHtml()
      await fileAccess.printExportHtml(html, document.title)
      setStatusMessage(unresolvedResources.length > 0 ? t.printDialogOpenedWithWarnings(unresolvedResources.length) : t.printDialogOpened)
    } catch (error) { setStatusMessage(getErrorMessage(error, t.fileOperationFailed)) }
  }, [buildCurrentExportHtml, closeMenu, document.title, fileAccess, setStatusMessage, t])

  const exportDocx = useCallback(async () => {
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
      setStatusMessage(savedPath
        ? result.formulaImageFallbacks + result.formulaTextFallbacks > 0
          ? t.exportDocxSavedWithFormulaFallbacks(result.formulaImageFallbacks, result.formulaTextFallbacks)
          : t.exportDocxSaved
        : t.exportCanceled)
    } catch (error) { setStatusMessage(getErrorMessage(error, t.fileOperationFailed)) }
  }, [closeMenu, document, fileAccess, setStatusMessage, t])

  return { exportDocx, exportHtml, exportPdf }
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
