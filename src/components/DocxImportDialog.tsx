import { Check, ChevronDown, FileText, LoaderCircle, Wrench, X } from 'lucide-react'
import type { Translation } from '../i18n'
import type { DocxImportStatus } from '../platform/fileAccess'

type DocxImportPhase = 'checking' | 'idle' | 'installing' | 'converting'

export function DocxImportDialog({
  open, phase, status, t, onClose, onConvert, onInstall, onRefresh, onSelectPython, onOpenPythonDownload,
}: {
  open: boolean
  phase: DocxImportPhase
  status: DocxImportStatus | null
  t: Translation
  onClose: () => void
  onConvert: () => void
  onInstall: () => void
  onRefresh: () => void
  onSelectPython: () => void
  onOpenPythonDownload: () => void
}) {
  if (!open) return null

  const busy = phase === 'checking' || phase === 'installing' || phase === 'converting'
  const isReady = status?.state === 'ready'
  const needsPython = status?.state === 'pythonMissing' || status?.state === 'pythonUnsupported'
  const canPrepareAutomatically = !needsPython || status?.canInstallPython
  const message = phase === 'checking'
    ? t.docxImportChecking
    : phase === 'installing'
      ? t.docxImportInstalling
      : phase === 'converting'
        ? t.docxImportConverting
        : status?.state === 'ready'
          ? t.docxImportReady
          : status?.state === 'pythonMissing'
            ? t.docxImportPythonMissing
            : status?.state === 'pythonUnsupported'
              ? t.docxImportPythonUnsupported
              : status?.state === 'componentsBroken'
                ? t.docxImportComponentsBroken
                : t.docxImportComponentsMissing

  return <div className="dialog-backdrop docx-import-backdrop" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
    <section className="docx-import-dialog" role="dialog" aria-modal="true" aria-labelledby="docx-import-title">
      <button type="button" className="about-close" onClick={onClose} aria-label={t.docxImportClose}>
        <X aria-hidden="true" />
      </button>
      <div className="docx-import-header">
        <div className="docx-import-icon" aria-hidden="true">
          {busy ? <LoaderCircle className="update-spinner" /> : isReady ? <FileText /> : <Wrench />}
        </div>
        <div>
          <h2 id="docx-import-title">{t.docxImportTitle}</h2>
          <p>{t.docxImportDescription}</p>
        </div>
      </div>
      <ol className="docx-import-steps" aria-label={t.docxImportSteps}>
        <li className={isReady ? 'complete' : 'active'}>
          <span>{isReady ? <Check aria-hidden="true" /> : '1'}</span>
          <div><strong>{t.docxImportStepSetup}</strong><small>{isReady ? t.docxImportStepSetupDone : t.docxImportStepSetupHint}</small></div>
        </li>
        <li className={isReady ? 'active' : ''}>
          <span>2</span>
          <div><strong>{t.docxImportStepChoose}</strong><small>{t.docxImportStepChooseHint}</small></div>
        </li>
      </ol>
      <p className="docx-import-status" role="status" aria-live="polite">{message}</p>
      {status?.message ? <p className="docx-import-error" role="alert">{status.message}</p> : null}
      <div className="docx-import-primary-action">
        {busy ? <button type="button" className="update-secondary-action" onClick={onClose}>{t.docxImportCancel}</button>
          : isReady ? <button type="button" className="update-primary-action" onClick={onConvert}>{t.docxImportConvert}</button>
            : <button type="button" className="update-primary-action" onClick={canPrepareAutomatically ? onInstall : onOpenPythonDownload}>{canPrepareAutomatically ? t.docxImportPrepare : t.docxImportDownloadPython}</button>}
      </div>
      {!busy ? <details className="docx-import-help">
        <summary><span>{t.docxImportHelp}</span><ChevronDown aria-hidden="true" /></summary>
        <div>
          {status?.pythonVersion ? <p className="docx-import-python">Python {status.pythonVersion}</p> : null}
          <p>{t.docxImportHelpDescription}</p>
          <div className="docx-import-help-actions">
            <button type="button" className="update-secondary-action" onClick={onRefresh}>{t.docxImportCheckAgain}</button>
            <button type="button" className="update-secondary-action" onClick={onSelectPython}>{t.docxImportUsePython}</button>
            {needsPython ? <button type="button" className="update-secondary-action" onClick={onOpenPythonDownload}>{t.docxImportOpenPythonDownload}</button> : null}
          </div>
        </div>
      </details> : null}
    </section>
  </div>
}
