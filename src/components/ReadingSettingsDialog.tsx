import { Monitor, Moon, RotateCcw, Sun, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import {
  READING_CONTENT_WIDTH_RANGE,
  READING_FONT_SIZE_RANGE,
  READING_LINE_HEIGHT_RANGE,
  type ReadingPreferences,
  type ReadingThemeMode,
} from '../domain/readingPreferences'
import type { Translation } from '../i18n'

type ReadingSettingsDialogProps = {
  open: boolean
  preferences: ReadingPreferences
  onClose: () => void
  onReset: () => void
  onUpdate: (changes: Partial<ReadingPreferences>) => void
  t: Translation
}

export function ReadingSettingsDialog({
  open,
  preferences,
  onClose,
  onReset,
  onUpdate,
  t,
}: ReadingSettingsDialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => {
      if (event.currentTarget === event.target) {
        onClose()
      }
    }}>
      <section className="reading-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="reading-settings-title">
        <button type="button" className="about-close" onClick={onClose} aria-label={t.closeReadingSettings}>
          <X aria-hidden="true" />
        </button>
        <header className="reading-settings-header">
          <h2 id="reading-settings-title">{t.readingSettings}</h2>
          <p>{t.readingSettingsSubtitle}</p>
        </header>

        <section className="reading-settings-section" aria-labelledby="theme-mode-label">
          <h3 id="theme-mode-label">{t.themeMode}</h3>
          <div className="reading-theme-modes" role="group" aria-label={t.themeMode}>
            <ThemeModeButton mode="system" value={preferences.themeMode} label={t.themeSystem} onChange={onUpdate} icon={<Monitor />} />
            <ThemeModeButton mode="light" value={preferences.themeMode} label={t.themeLight} onChange={onUpdate} icon={<Sun />} />
            <ThemeModeButton mode="dark" value={preferences.themeMode} label={t.themeDark} onChange={onUpdate} icon={<Moon />} />
          </div>
        </section>

        <section className="reading-settings-section" aria-labelledby="font-family-label">
          <h3 id="font-family-label">{t.readingFont}</h3>
          <div className="reading-font-options" role="group" aria-label={t.readingFont}>
            <button type="button" className={preferences.fontFamily === 'sans' ? 'active' : ''} onClick={() => onUpdate({ fontFamily: 'sans' })}>{t.fontSans}</button>
            <button type="button" className={preferences.fontFamily === 'serif' ? 'active' : ''} onClick={() => onUpdate({ fontFamily: 'serif' })}>{t.fontSerif}</button>
            <button type="button" className={preferences.fontFamily === 'monospace' ? 'active' : ''} onClick={() => onUpdate({ fontFamily: 'monospace' })}>{t.fontMonospace}</button>
          </div>
        </section>

        <section className="reading-settings-section reading-settings-sliders" aria-label={t.readingLayout}>
          <RangeSetting label={t.fontSize(preferences.fontSize)} value={preferences.fontSize} range={READING_FONT_SIZE_RANGE} onChange={(fontSize) => onUpdate({ fontSize })} />
          <RangeSetting label={t.lineHeight(preferences.lineHeight)} value={preferences.lineHeight} range={READING_LINE_HEIGHT_RANGE} onChange={(lineHeight) => onUpdate({ lineHeight })} />
          <RangeSetting label={t.contentWidth(preferences.contentWidth)} value={preferences.contentWidth} range={READING_CONTENT_WIDTH_RANGE} onChange={(contentWidth) => onUpdate({ contentWidth })} />
        </section>

        <footer className="reading-settings-actions">
          <button type="button" className="reading-settings-reset" onClick={onReset}>
            <RotateCcw aria-hidden="true" />
            {t.resetReadingSettings}
          </button>
        </footer>
      </section>
    </div>
  )
}

function ThemeModeButton({
  mode,
  value,
  label,
  onChange,
  icon,
}: {
  mode: ReadingThemeMode
  value: ReadingThemeMode
  label: string
  onChange: (changes: Partial<ReadingPreferences>) => void
  icon: ReactNode
}) {
  return (
    <button type="button" className={value === mode ? 'active' : ''} onClick={() => onChange({ themeMode: mode })} aria-pressed={value === mode}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

function RangeSetting({
  label,
  value,
  range,
  onChange,
}: {
  label: string
  value: number
  range: { min: number; max: number; step: number }
  onChange: (value: number) => void
}) {
  return (
    <label className="reading-range-setting">
      <span>{label}</span>
      <input type="range" min={range.min} max={range.max} step={range.step} value={value} onChange={(event) => onChange(Number(event.currentTarget.value))} />
    </label>
  )
}
