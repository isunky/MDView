import { useEffect, useRef } from 'react'
import { ListTree, PanelLeftClose } from 'lucide-react'
import type { MarkdownOutlineItem } from '../domain/markdownOutline'
import type { OutlineDepth } from '../domain/outlinePreferences'
import type { Translation } from '../i18n'

const OUTLINE_DEPTH_OPTIONS: OutlineDepth[] = [1, 2, 3, 4]

type DocumentOutlineProps = {
  items: MarkdownOutlineItem[]
  activeId?: string | null
  maxDepth: OutlineDepth
  onJump: (id: string) => void
  onMaxDepthChange: (depth: OutlineDepth) => void
  onClose: () => void
  t: Translation
}

export function DocumentOutline({
  items,
  activeId,
  maxDepth,
  onJump,
  onMaxDepthChange,
  onClose,
  t,
}: DocumentOutlineProps) {
  const depthPickerRef = useRef<HTMLDetailsElement>(null)
  const activeItemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const activeItem = activeItemRef.current
    if (typeof activeItem?.scrollIntoView !== 'function') {
      return
    }

    activeItem.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'auto',
    })
  }, [activeId])

  function handleDepthChange(depth: OutlineDepth) {
    onMaxDepthChange(depth)
    depthPickerRef.current?.removeAttribute('open')
  }

  return (
    <nav className="document-outline" aria-label={t.outlineNav}>
      <div className="outline-header">
        <div className="outline-heading">
          <details
            className="outline-depth-picker"
            ref={depthPickerRef}
            onBlur={(event) => {
              if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                event.currentTarget.removeAttribute('open')
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.currentTarget.removeAttribute('open')
                event.currentTarget.querySelector('summary')?.focus()
              }
            }}
          >
            <summary
              className="outline-heading-icon"
              aria-label={t.outlineDepthMenu}
              title={t.outlineDepthMenu}
            >
              <ListTree aria-hidden="true" />
            </summary>
            <div className="outline-depth-menu">
              <div className="outline-depth-label">{t.outlineDepthLabel}</div>
              <div className="outline-depth-options" role="group" aria-label={t.outlineDepthLabel}>
                {OUTLINE_DEPTH_OPTIONS.map((depth) => (
                  <button
                    key={depth}
                    type="button"
                    className={depth === maxDepth ? 'active' : ''}
                    onClick={() => handleDepthChange(depth)}
                    aria-label={t.outlineDepthOption(depth)}
                    aria-pressed={depth === maxDepth}
                  >
                    H{depth}
                  </button>
                ))}
              </div>
            </div>
          </details>
          <div className="outline-title">{t.outline}</div>
        </div>
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
                  ref={isActive ? activeItemRef : undefined}
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
