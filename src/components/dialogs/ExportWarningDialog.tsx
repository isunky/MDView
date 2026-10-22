import type { Translation } from '../../i18n'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export function ExportWarningDialog({ open, onClose, onContinue, onHtml, t }: {
  open: boolean; onClose: () => void; onContinue: () => void; onHtml: () => void; t: Translation
}) {
  const ref = useDialogFocus(open, onClose)
  if (!open) return null
  return <div ref={ref} className="dialog-backdrop">
    <section className="draft-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="export-warning-title">
      <h2 id="export-warning-title">{t.exportDiagramTitle}</h2>
      <p>{t.exportDiagramDescription}</p>
      <div className="draft-recovery-actions">
        <button type="button" className="update-secondary-action" onClick={onClose}>{t.cancelAction}</button>
        <button type="button" className="update-secondary-action" onClick={onHtml}>{t.exportUseHtml}</button>
        <button type="button" className="update-primary-action" onClick={onContinue}>{t.exportContinueWord}</button>
      </div>
    </section>
  </div>
}
