import { useLayoutEffect, useRef } from 'react'

const stack: HTMLElement[] = []
const originalInert = new Map<HTMLElement, boolean>()
let previousOverflow = ''

function updateBackground() {
  for (const [element, inert] of originalInert) element.inert = inert
  originalInert.clear()
  let current = stack.at(-1)
  while (current?.parentElement) {
    for (const sibling of current.parentElement.children) {
      if (sibling !== current && sibling instanceof HTMLElement) {
        originalInert.set(sibling, sibling.inert)
        sibling.inert = true
      }
    }
    current = current.parentElement
    if (current === document.body) break
  }
}

/** Shared keyboard and background handling, including nested dialogs. */
export function useDialogFocus(open: boolean, onClose?: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => { closeRef.current = onClose })
  useLayoutEffect(() => {
    const root = ref.current
    if (!open || !root) return
    const previousFocus = document.activeElement as HTMLElement | null
    const fallback = previousFocus?.closest('.action-menu')?.querySelector<HTMLElement>('button[aria-haspopup]')
      ?? document.querySelector<HTMLElement>('[data-menu-trigger="app"]')
    if (!stack.length) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    stack.push(root)
    updateBackground()
    const controls = () => Array.from(root.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]',
    )).filter(element => !element.closest('[inert]') && !element.hidden && getComputedStyle(element).display !== 'none')
    const focusFirst = () => {
      const target = root.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? controls()[0]
      if (target) target.focus()
      else { root.tabIndex = -1; root.focus() }
    }
    focusFirst()
    const handleKey = (event: KeyboardEvent) => {
      if (stack.at(-1) !== root) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        closeRef.current?.()
      } else if (event.key === 'Tab') {
        const items = controls()
        const first = items[0]
        const last = items.at(-1)
        if (!items.includes(document.activeElement as HTMLElement)) {
          event.preventDefault(); (event.shiftKey ? last : first)?.focus()
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus()
        }
      } else if ((event.ctrlKey || event.metaKey) && ['n', 'o', 's', 'f', 'h'].includes(event.key.toLowerCase())) {
        // File/search shortcuts must not operate on the document behind a modal.
        event.preventDefault(); event.stopImmediatePropagation()
      }
    }
    const handleFocus = (event: FocusEvent) => {
      if (stack.at(-1) === root && !root.contains(event.target as Node)) focusFirst()
    }
    window.addEventListener('keydown', handleKey, true)
    document.addEventListener('focusin', handleFocus)
    return () => {
      const wasTop = stack.at(-1) === root
      stack.splice(stack.indexOf(root), 1)
      window.removeEventListener('keydown', handleKey, true)
      document.removeEventListener('focusin', handleFocus)
      updateBackground()
      if (!stack.length) document.body.style.overflow = previousOverflow
      if (wasTop) {
        const target = previousFocus?.isConnected ? previousFocus : fallback
        if (target?.isConnected && !target.closest('[inert]')) target.focus()
      }
    }
  }, [open])
  return ref
}
