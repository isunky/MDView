import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import type { FileAccess } from './platform/fileAccess.ts'

declare global {
  interface Window {
    __MDVIEW_E2E_FILE_ACCESS__?: FileAccess
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App fileAccess={window.__MDVIEW_E2E_FILE_ACCESS__} />
  </StrictMode>,
)
