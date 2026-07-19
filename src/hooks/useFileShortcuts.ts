import { useEffect, useEffectEvent, useMemo } from 'react'
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
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const isNewShortcut = matchesShortcut(event, { key: 'n' }, platform)
    const isOpenShortcut = matchesShortcut(event, { key: 'o' }, platform)
    const isSaveShortcut = matchesShortcut(event, { key: 's' }, platform)
    const isSaveAsShortcut = matchesShortcut(event, { key: 's', shiftKey: true }, platform)

    if (!isNewShortcut && !isOpenShortcut && !isSaveShortcut && !isSaveAsShortcut) {
      return
    }

    event.preventDefault()
    options.onCloseMenu()

    if (isNewShortcut) {
      void options.onNew()
      return
    }

    if (!options.supportsNativeFiles) {
      return
    }

    if (isOpenShortcut) {
      void options.onOpen()
      return
    }

    if (isSaveAsShortcut) {
      void options.onSaveAs()
      return
    }

    void options.onSave().then((saved) => {
      if (saved) {
        options.onSaveSuccess()
      }
    })
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return platform
}
