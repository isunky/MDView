import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

export type AppMenuId = 'file' | 'reading' | 'app'

export function useAppMenu() {
  const [activeMenu, setActiveMenu] = useState<AppMenuId | null>(null)
  const menuBarRef = useRef<HTMLElement | null>(null)
  const pendingFocus = useRef<'first' | 'last' | null>(null)

  useLayoutEffect(() => {
    if (!activeMenu || !pendingFocus.current) return
    const items = menuBarRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
    const item = pendingFocus.current === 'last' ? items?.[items.length - 1] : items?.[0]
    pendingFocus.current = null
    item?.focus()
  }, [activeMenu])

  useEffect(() => {
    if (!activeMenu) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && menuBarRef.current?.contains(target)) {
        return
      }

      setActiveMenu(null)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault()
        menuBarRef.current?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${activeMenu}"]`)?.focus()
        setActiveMenu(null)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeMenu])

  const closeMenu = useCallback(() => setActiveMenu(null), [])
  const toggleMenu = useCallback((menuId: AppMenuId) => {
    setActiveMenu((currentMenu) => currentMenu === menuId ? null : menuId)
  }, [])

  const handleMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    const trigger = target.closest<HTMLButtonElement>('[data-menu-trigger]')
    const menuId = trigger?.dataset.menuTrigger as AppMenuId | undefined
    if (menuId && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      if (activeMenu === menuId) {
        const items = menuBarRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        const item = event.key === 'ArrowUp' ? items?.[items.length - 1] : items?.[0]
        item?.focus()
      } else {
        pendingFocus.current = event.key === 'ArrowUp' ? 'last' : 'first'
        setActiveMenu(menuId)
      }
      return
    }
    if (!activeMenu) return
    const activeTrigger = menuBarRef.current?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${activeMenu}"]`)
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
      }
      activeTrigger?.focus()
      setActiveMenu(null)
      return
    }
    if (!target.closest('[role="menu"]')) return
    const items = Array.from(menuBarRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const current = items.indexOf(target as HTMLButtonElement)
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[index]?.focus()
      items[index]?.scrollIntoView?.({ block: 'nearest' })
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const formats = target.closest('.menu-export-formats')
      if (formats) {
        const options = Array.from(formats.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
        const index = options.indexOf(target as HTMLButtonElement)
        options[(index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length]?.focus()
        return
      }
      const triggers = Array.from(menuBarRef.current?.querySelectorAll<HTMLButtonElement>('[data-menu-trigger]:not(:disabled)') ?? [])
      const index = activeTrigger ? triggers.indexOf(activeTrigger) : -1
      const next = triggers[(index + (event.key === 'ArrowRight' ? 1 : -1) + triggers.length) % triggers.length]
      if (next) {
        pendingFocus.current = 'first'
        next.focus()
        setActiveMenu(next.dataset.menuTrigger as AppMenuId)
      }
    }
  }, [activeMenu])

  return {
    activeMenu,
    closeMenu,
    handleMenuKeyDown,
    menuBarRef,
    toggleMenu,
  }
}
