import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadReadingPreferences, resolveEffectiveReadingTheme } from './domain/readingPreferences.ts'
import type { FileAccess } from './platform/fileAccess.ts'
import { bootstrapReadingTheme } from './platform/readingTheme.ts'

declare global {
  interface Window {
    __MDVIEW_E2E_FILE_ACCESS__?: FileAccess
  }
}

bootstrapReadingTheme(loadReadingPreferences, (preferences, systemTheme) =>
  resolveEffectiveReadingTheme(preferences.themeMode, systemTheme),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App fileAccess={window.__MDVIEW_E2E_FILE_ACCESS__} />
  </StrictMode>,
)
