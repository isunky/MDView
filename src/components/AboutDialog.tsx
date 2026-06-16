import { useEffect } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { appInfo } from '../appInfo'
import type { Translation } from '../i18n'
import { AppLogo } from './AppLogo'

type AboutDialogProps = {
  open: boolean
  onClose: () => void
  t: Translation
}

export function AboutDialog({ open, onClose, t }: AboutDialogProps) {
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
          aria-label={t.closeAbout}
        >
          <X aria-hidden="true" />
        </button>

        <div className="about-header">
          <div className="about-mark" aria-hidden="true">
            <AppLogo />
          </div>
          <div>
            <h2 id="about-title">{t.aboutTitle}</h2>
            <p>{t.aboutSubtitle}</p>
          </div>
        </div>

        <dl className="about-meta">
          <div className="about-row">
            <dt>{t.versionLabel}</dt>
            <dd>{t.versionValue(appInfo.version)}</dd>
          </div>
          <div className="about-row">
            <dt>{t.authorLabel}</dt>
            <dd>{appInfo.author}</dd>
          </div>
          <div className="about-row">
            <dt>{t.websiteLabel}</dt>
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
