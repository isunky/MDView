import { PanelLeftClose } from 'lucide-react'
import type { MarkdownOutlineItem } from '../domain/markdownOutline'
import type { Translation } from '../i18n'

type DocumentOutlineProps = {
  items: MarkdownOutlineItem[]
  onJump: (id: string) => void
  onClose: () => void
  t: Translation
}

export function DocumentOutline({ items, onJump, onClose, t }: DocumentOutlineProps) {
  return (
    <nav className="document-outline" aria-label={t.outlineNav}>
      <div className="outline-header">
        <div className="outline-title">{t.outline}</div>
        <button
          type="button"
          className="outline-close"
          onClick={onClose}
          aria-label={t.collapseOutline}
        >
          <PanelLeftClose aria-hidden="true" />
        </button>
      </div>
      {items.length > 0 ? (
        <ol className="outline-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`outline-link depth-${item.level}`}
                onClick={() => onJump(item.id)}
                aria-label={t.jumpTo(item.text)}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="outline-empty">{t.noHeadings}</p>
      )}
    </nav>
  )
}
