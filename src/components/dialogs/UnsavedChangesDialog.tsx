import type { Translation } from '../../i18n'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export function UnsavedChangesDialog({ open, title, saving, canSave, onChoose, t }: {
  open: boolean; title: string; saving: boolean; canSave: boolean
  onChoose: (choice: 'save' | 'discard' | 'cancel') => void; t: Translation
}) {
  const ref = useDialogFocus(open, saving ? undefined : () => onChoose('cancel'))
  if (!open) return null
  return <div ref={ref} className="dialog-backdrop">
    <section className="draft-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
      <h2 id="unsaved-title">{t.unsavedChangesTitle}</h2>
      <p>{t.unsavedChangesDescription(title)}</p>
      <div className="draft-recovery-actions">
        <button type="button" className="update-secondary-action" onClick={() => onChoose('cancel')} disabled={saving} data-dialog-initial-focus>{t.cancelAction}</button>
        <button type="button" className="update-secondary-action" onClick={() => onChoose('discard')} disabled={saving}>{t.dontSave}</button>
        <button type="button" className="update-primary-action" onClick={() => onChoose('save')} disabled={saving || !canSave} title={canSave ? undefined : t.nativeFileUnavailable}>{saving ? t.saving : t.saveAndContinue}</button>
      </div>
    </section>
  </div>
}
