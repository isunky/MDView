import { invoke } from '@tauri-apps/api/core'

export type SystemFontAccess = {
  supportsSystemFonts: boolean
  listSystemFontFamilies: () => Promise<string[]>
}

export const systemFontAccess: SystemFontAccess = {
  supportsSystemFonts: supportsSystemFonts(),

  async listSystemFontFamilies() {
    if (!supportsSystemFonts()) {
      return []
    }

    return invoke<string[]>('list_system_font_families')
  },
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function supportsSystemFonts(): boolean {
  return isTauriRuntime()
    && typeof navigator !== 'undefined'
    && /Mac|Win/.test(navigator.platform)
}
