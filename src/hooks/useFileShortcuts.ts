import { useEffect, useMemo, useRef } from 'react'
import {
  detectShortcutPlatform,
  matchesShortcut,
  type ShortcutPlatform,
} from '../platform/keyboardShortcuts'

type UseFileShortcutsOptions = {
  supportsNativeFiles: boolean
  onCloseMenu: () => void
  onNew: () => void | Promise<void>
  onOpen: () => void | Promise<void>
  onSave: () => Promise<boolean>
  onSaveAs: () => void | Promise<void>
  onSaveSuccess: () => void
}

export function useFileShortcuts(options: UseFileShortcutsOptions): ShortcutPlatform {
  const platform = useMemo(() => detectShortcutPlatform(), [])
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isNewShortcut = matchesShortcut(event, { key: 'n' }, platform)
      const isOpenShortcut = matchesShortcut(event, { key: 'o' }, platform)
      const isSaveShortcut = matchesShortcut(event, { key: 's' }, platform)
      const isSaveAsShortcut = matchesShortcut(event, { key: 's', shiftKey: true }, platform)

      if (!isNewShortcut && !isOpenShortcut && !isSaveShortcut && !isSaveAsShortcut) {
        return
      }

      event.preventDefault()
      const current = optionsRef.current
      current.onCloseMenu()

      if (isNewShortcut) {
        void current.onNew()
        return
      }

      if (!current.supportsNativeFiles) {
        return
      }

      if (isOpenShortcut) {
        void current.onOpen()
        return
      }

      if (isSaveAsShortcut) {
        void current.onSaveAs()
        return
      }

      void current.onSave().then((saved) => {
        if (saved) {
          current.onSaveSuccess()
        }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [platform])

  return platform
}
