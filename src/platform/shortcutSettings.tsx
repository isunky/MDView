/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export const SHORTCUT_IDS = [
  'new', 'open', 'save', 'saveAs', 'find', 'undo', 'redo', 'bold', 'italic', 'link', 'orderedList', 'unorderedList',
  'moveUp', 'moveDown', 'copyUp', 'copyDown', 'deleteLine', 'indent', 'outdent', 'tableNext', 'tablePrevious', 'listContinue',
  'findNext', 'findPrevious', 'replaceCurrent', 'previewPrevious', 'previewNext', 'previewZoomIn', 'previewZoomOut', 'previewReset', 'mathConfirm',
] as const
export type ShortcutId = typeof SHORTCUT_IDS[number]
const STORAGE_KEY = 'mdview.disabledShortcuts.v1'

type Settings = { disabled: ReadonlySet<ShortcutId>; isEnabled: (id: ShortcutId) => boolean; setEnabled: (id: ShortcutId, enabled: boolean) => void; setAll: (enabled: boolean) => void }
const defaultSettings: Settings = { disabled: new Set(), isEnabled: () => true, setEnabled: () => {}, setAll: () => {} }
const ShortcutContext = createContext<Settings>(defaultSettings)

function readDisabled(): Set<ShortcutId> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is ShortcutId => SHORTCUT_IDS.includes(id as ShortcutId)) : [])
  } catch { return new Set() }
}

function persist(disabled: Set<ShortcutId>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...disabled])) } catch { /* Keep settings for this session. */ }
}

export function ShortcutSettingsProvider({ children }: { children: ReactNode }) {
  const [disabled, setDisabled] = useState(readDisabled)
  const setEnabled = useCallback((id: ShortcutId, enabled: boolean) => {
    setDisabled((current) => {
      const next = new Set(current)
      if (enabled) next.delete(id); else next.add(id)
      persist(next)
      return next
    })
  }, [])
  const setAll = useCallback((enabled: boolean) => {
    const next = new Set<ShortcutId>(enabled ? [] : SHORTCUT_IDS)
    persist(next)
    setDisabled(next)
  }, [])
  const value = useMemo(() => ({ disabled, isEnabled: (id: ShortcutId) => !disabled.has(id), setEnabled, setAll }), [disabled, setAll, setEnabled])
  return <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>
}

export function useShortcutSettings() { return useContext(ShortcutContext) }
