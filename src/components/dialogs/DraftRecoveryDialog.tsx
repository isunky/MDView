import { useDialogFocus } from '../../hooks/useDialogFocus'
import type { RecoverableDraft } from '../../domain/documentDraft'
import type { Translation } from '../../i18n'

type DraftRecoveryDialogProps = {
  draft: RecoverableDraft | null
  onDiscard: () => void
  onRestore: () => void
  t: Translation
}

export function DraftRecoveryDialog({ draft, onDiscard, onRestore, t }: DraftRecoveryDialogProps) {
  const dialogRef = useDialogFocus(Boolean(draft))
  if (!draft) {
    return null
  }

  return (
    <div ref={dialogRef} className="dialog-backdrop">
      <section className="draft-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="draft-recovery-title">
        <h2 id="draft-recovery-title">{t.draftRecoveryTitle}</h2>
        <p>{t.draftRecoveryDescription(draft.title, new Date(draft.updatedAt).toLocaleString())}</p>
        <div className="draft-recovery-actions">
          <button type="button" className="update-secondary-action" onClick={onDiscard}>
            {t.discardDraft}
          </button>
          <button type="button" className="update-primary-action" onClick={onRestore}>
            {t.restoreDraft}
          </button>
        </div>
      </section>
    </div>
  )
}
