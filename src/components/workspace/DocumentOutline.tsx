import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ListTree, PanelLeftClose } from 'lucide-react'
import type { MarkdownOutlineItem } from '../../domain/markdownOutline'
import type { OutlineDepth } from '../../domain/outlinePreferences'
import type { Translation } from '../../i18n'

const OUTLINE_DEPTH_OPTIONS: OutlineDepth[] = [1, 2, 3, 4, 5]

type DocumentOutlineProps = {
  onSetSubtree?: (id: string, expanded: boolean) => void
  collapsedIds?: ReadonlySet<string>
  onToggleBranch?: (id: string) => void
  onSetAllBranches?: (expanded: boolean) => void
  items: MarkdownOutlineItem[]
  activeId?: string | null
  maxDepth: OutlineDepth
  onJump: (id: string) => void
  onMaxDepthChange: (depth: OutlineDepth) => void
  onClose: () => void
  t: Translation
}

export function DocumentOutline({
  onSetSubtree,
  collapsedIds,
  onToggleBranch,
  onSetAllBranches,
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
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuTrigger = useRef<HTMLButtonElement | null>(null)
  const [menu, setMenu] = useState<{ id: string; x: number; y: number; hasChildren: boolean } | null>(null)
  function cancelJump() {
    if (jumpTimer.current !== null) clearTimeout(jumpTimer.current)
    jumpTimer.current = null
  }
  useEffect(() => () => cancelJump(), [items])
  useEffect(() => {
    if (!menu) return
    menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const dismiss = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null)
    }
    const close = () => setMenu(null)
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', close)
    }
  }, [menu])
  const parents: MarkdownOutlineItem[] = []
  const visibleItems = items.flatMap((item, index) => {
    while (parents.length && parents[parents.length - 1].level >= item.level) parents.pop()
    const hidden = parents.some((parent) => collapsedIds?.has(parent.id))
    parents.push(item)
    return hidden ? [] : [{ item, hasChildren: items[index + 1]?.level > item.level }]
  })

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
  }, [activeId, collapsedIds, maxDepth])

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
            {onSetAllBranches ? <div className="outline-branch-actions">
              <button type="button" onClick={() => onSetAllBranches(true)}>{t.outlineExpandAll}</button>
              <button type="button" onClick={() => onSetAllBranches(false)}>{t.outlineCollapseAll}</button>
            </div> : null}
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
          {visibleItems.map(({ item, hasChildren }) => {
            const isActive = item.id === activeId

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`outline-link depth-${item.level}${isActive ? ' active' : ''}`}
                  onClick={(event) => {
                    cancelJump()
                    if (!hasChildren || !onToggleBranch || event.detail === 0) onJump(item.id)
                    else if (event.detail === 1) jumpTimer.current = setTimeout(() => onJump(item.id), 300)
                  }}
                  onDoubleClick={() => {
                    cancelJump()
                    if (hasChildren) onToggleBranch?.(item.id)
                  }}
                  onContextMenu={(event) => {
                    if (!onSetSubtree) return
                    event.preventDefault()
                    cancelJump()
                    menuTrigger.current = event.currentTarget
                    const rect = event.currentTarget.getBoundingClientRect()
                    setMenu({ id: item.id, hasChildren,
                      x: Math.max(8, Math.min(event.clientX || rect.left, window.innerWidth - 208)),
                      y: Math.max(8, Math.min(event.clientY || rect.bottom, window.innerHeight - 92)),
                    })
                  }}
                  aria-expanded={hasChildren ? !collapsedIds?.has(item.id) : undefined}
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
      {menu && onSetSubtree ? createPortal(<div
        ref={menuRef}
        className="outline-context-menu"
        role="menu"
        style={{ left: menu.x, top: menu.y }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMenu(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            setMenu(null)
            menuTrigger.current?.focus()
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
            buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus()
          }
        }}
      >{[true, false].map((expanded) => <button key={String(expanded)} type="button" role="menuitem"
        disabled={!menu.hasChildren}
        onClick={() => {
          onSetSubtree(menu.id, expanded)
          setMenu(null)
          menuTrigger.current?.focus()
        }}
      >{expanded ? t.outlineExpandChildren : t.outlineCollapseChildren}</button>)}</div>, document.body) : null}
    </nav>
  )
}
