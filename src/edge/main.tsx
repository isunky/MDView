import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../App'
import '../index.css'
import { loadReadingPreferences, resolveEffectiveReadingTheme } from '../domain/readingPreferences'
import { bootstrapReadingTheme } from '../platform/readingTheme'
import { unsupportedAppUpdateClient } from '../platform/unsupportedAppUpdates'
import { edgeFileAccess } from './edgeFileAccess'

bootstrapReadingTheme(loadReadingPreferences, (preferences, systemTheme) =>
  resolveEffectiveReadingTheme(preferences.themeMode, systemTheme),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      appUpdateClient={unsupportedAppUpdateClient}
      fileAccess={edgeFileAccess}
      supportsAppUpdates={false}
    />
  </StrictMode>,
)
