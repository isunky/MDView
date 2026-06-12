import { useEffect } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { appInfo } from '../appInfo'

type AboutDialogProps = {
  open: boolean
  onClose: () => void
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose()
        }
      }}
    >
      <section
        className="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
      >
        <button
          type="button"
          className="about-close"
          onClick={onClose}
          aria-label="Close about dialog"
        >
          <X aria-hidden="true" />
        </button>

        <div className="about-header">
          <div className="about-mark" aria-hidden="true">
            MD
          </div>
          <div>
            <h2 id="about-title">About {appInfo.name}</h2>
            <p>Markdown viewer and editor</p>
          </div>
        </div>

        <dl className="about-meta">
          <div className="about-row">
            <dt>Version</dt>
            <dd>Version {appInfo.version}</dd>
          </div>
          <div className="about-row">
            <dt>Author</dt>
            <dd>{appInfo.author}</dd>
          </div>
          <div className="about-row">
            <dt>Website</dt>
            <dd>
              <a href={appInfo.websiteUrl} target="_blank" rel="noreferrer">
                {appInfo.website}
                <ExternalLink aria-hidden="true" />
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
