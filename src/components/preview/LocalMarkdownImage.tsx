import { useEffect, useState, type ComponentProps } from 'react'
import { createPortal } from 'react-dom'
import { resolveLocalMarkdownResource } from '../../domain/localMarkdownResources'
import type { FileAccess } from '../../platform/fileAccess'
import type { MarkdownPreviewLabels } from './previewTypes'

type Props = Omit<ComponentProps<'img'>, 'src' | 'alt'> & {
  src?: string
  alt?: string
  sourcePath?: string | null
  readLocalImageFile?: FileAccess['readLocalImageFile']
  labels: MarkdownPreviewLabels
}

export function LocalMarkdownImage({ src, alt, sourcePath, readLocalImageFile, labels, ...props }: Props) {
  const [resolvedSrc, setResolvedSrc] = useState(src)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const resource = resolveLocalMarkdownResource(src, sourcePath)
  const displaySrc = resource?.kind === 'image' && readLocalImageFile ? resolvedSrc : src

  useEffect(() => {
    let canceled = false
    if (resource?.kind !== 'image' || !readLocalImageFile) {
      return
    }
    void readLocalImageFile(resource.path)
      .then((image) => { if (!canceled) setResolvedSrc(image.dataUrl) })
      .catch(() => { if (!canceled) setResolvedSrc(src) })
    return () => { canceled = true }
  }, [readLocalImageFile, resource?.kind, resource?.path, src])

  useEffect(() => {
    if (!previewSrc) return
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setPreviewSrc(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewSrc])

  return <>
    <span className="markdown-image">
      <img src={displaySrc} alt={alt} onClick={() => displaySrc && setPreviewSrc(displaySrc)} {...props} />
      {alt ? <span className="markdown-image-caption">{alt}</span> : null}
    </span>
    {previewSrc ? createPortal(
      <div className="image-preview-backdrop" role="dialog" aria-modal="true" aria-label={labels.imagePreview}
        onMouseDown={(event) => { if (event.currentTarget === event.target) setPreviewSrc(null) }}>
        <button type="button" className="image-preview-close" onClick={() => setPreviewSrc(null)} aria-label={labels.closeImagePreview}>×</button>
        <img className="image-preview-image" src={previewSrc} alt={labels.imagePreviewAlt(alt ?? 'Image')} />
      </div>, document.body,
    ) : null}
  </>
}
