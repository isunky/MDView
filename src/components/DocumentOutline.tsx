import { PanelLeftClose } from 'lucide-react'
import type { MarkdownOutlineItem } from '../domain/markdownOutline'

type DocumentOutlineProps = {
  items: MarkdownOutlineItem[]
  onJump: (id: string) => void
  onClose: () => void
}

export function DocumentOutline({ items, onJump, onClose }: DocumentOutlineProps) {
  return (
    <nav className="document-outline" aria-label="Document outline">
      <div className="outline-header">
        <div className="outline-title">Outline</div>
        <button
          type="button"
          className="outline-close"
          onClick={onClose}
          aria-label="Collapse document outline"
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
                aria-label={`Jump to ${item.text}`}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="outline-empty">No headings</p>
      )}
    </nav>
  )
}
