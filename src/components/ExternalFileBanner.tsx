type ExternalFileBannerProps = {
  state: { kind: 'conflict'; file: { path: string } } | { kind: 'missing'; path: string }
  labels: { conflict: string; missing: string; keepEdits: string; reload: string; retry: string; saveAs: string }
  onKeepEdits: () => void
  onReload: () => void
  onRetry: () => void
  onSaveAs: () => void
}

export function ExternalFileBanner({ state, labels, onKeepEdits, onReload, onRetry, onSaveAs }: ExternalFileBannerProps) {
  const isConflict = state.kind === 'conflict'
  const path = isConflict ? state.file.path : state.path
  return <section className="external-file-banner" role="status" aria-live="polite">
    <div>
      <strong>{isConflict ? labels.conflict : labels.missing}</strong>
      <span title={path}>{path}</span>
    </div>
    <div className="external-file-banner-actions">
      {isConflict ? <>
        <button type="button" className="primary" onClick={onKeepEdits}>{labels.keepEdits}</button>
        <button type="button" onClick={onReload}>{labels.reload}</button>
      </> : <>
        <button type="button" onClick={onRetry}>{labels.retry}</button>
        <button type="button" className="primary" onClick={onSaveAs}>{labels.saveAs}</button>
      </>}
    </div>
  </section>
}
