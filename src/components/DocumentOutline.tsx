import { PanelLeftClose } from 'lucide-react'
import type { MarkdownOutlineItem } from '../domain/markdownOutline'
import type { Translation } from '../i18n'

type DocumentOutlineProps = {
  items: MarkdownOutlineItem[]
  activeId?: string | null
  onJump: (id: string) => void
  onClose: () => void
  t: Translation
}

export function DocumentOutline({ items, activeId, onJump, onClose, t }: DocumentOutlineProps) {
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
          {items.map((item) => {
            const isActive = item.id === activeId

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`outline-link depth-${item.level}${isActive ? ' active' : ''}`}
                  onClick={() => onJump(item.id)}
                  aria-label={t.jumpTo(item.text)}
                  aria-current={isActive ? 'location' : undefined}
                >
                  {item.text}
                </button>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="outline-empty">{t.noHeadings}</p>
      )}
    </nav>
  )
}
