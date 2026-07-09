import { useCallback, useEffect, useRef, useState } from 'react'

export type AppMenuId = 'file' | 'export' | 'app'

export function useAppMenu() {
  const [activeMenu, setActiveMenu] = useState<AppMenuId | null>(null)
  const menuBarRef = useRef<HTMLElement | null>(null)

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
      if (event.key === 'Escape') {
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

  return {
    activeMenu,
    closeMenu,
    menuBarRef,
    toggleMenu,
  }
}
