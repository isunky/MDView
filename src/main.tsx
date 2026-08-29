import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadReadingPreferences, resolveEffectiveReadingTheme } from './domain/readingPreferences.ts'
import type { FileAccess } from './platform/fileAccess.ts'
import { tauriFileAccess } from './platform/fileAccess.ts'
import { tauriAppUpdateClient } from './platform/appUpdates.ts'
import { bootstrapReadingTheme } from './platform/readingTheme.ts'
import { setTheme } from '@tauri-apps/api/app'
import { openUrl } from '@tauri-apps/plugin-opener'
import { createTauriWindowFrame } from './platform/tauriWindowFrame.ts'

declare global {
  interface Window {
    __MDVIEW_E2E_FILE_ACCESS__?: FileAccess
  }
}

bootstrapReadingTheme(loadReadingPreferences, (preferences, systemTheme) =>
  resolveEffectiveReadingTheme(preferences.themeMode, systemTheme),
)

window.__MDVIEW_SYNC_NATIVE_THEME__ = setTheme
window.__MDVIEW_OPEN_EXTERNAL_LINK__ = openUrl

const windowFrame = createTauriWindowFrame()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      appUpdateClient={tauriAppUpdateClient}
      fileAccess={window.__MDVIEW_E2E_FILE_ACCESS__ ?? tauriFileAccess}
      windowFrame={windowFrame}
    />
  </StrictMode>,
)
