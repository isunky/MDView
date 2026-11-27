import { lazy, Suspense } from 'react'
import type { Translation } from '../../i18n'
import type { RecoverableDraft } from '../../domain/documentDraft'
import type { AppDistribution, AppUpdateCandidate, AppUpdateProgress } from '../../platform/appUpdates'
import type { AppUpdatePhase } from '../../hooks/useAppUpdater'
import type { ReadingPreferences } from '../../domain/readingPreferences'
import { AboutDialog } from '../dialogs/AboutDialog'
import { DraftRecoveryDialog } from '../dialogs/DraftRecoveryDialog'
import { UpdateDialog } from '../dialogs/UpdateDialog'
import { DocxImportDialog } from '../dialogs/DocxImportDialog'
import type { DocxImportStatus } from '../../platform/fileAccess'

const ReadingSettingsDialog = lazy(async () => ({
  default: (await import('../dialogs/ReadingSettingsDialog')).ReadingSettingsDialog,
}))

export function AppDialogs({
  availableUpdate, distribution, isAboutOpen, isReadingSettingsOpen, pendingDraft,
  isDocxImportOpen, docxImportPhase, docxImportStatus, readingPreferences, t, updateErrorMessage, updatePhase, updateProgress,
  onCheckUpdates, onCloseAbout, onCloseReadingSettings, onDismissUpdate, onDiscardDraft,
  onInstallUpdate, onOpenPortableDownload, onRestoreDraft,
  onUpdateReadingPreferences,
  onCloseDocxImport, onConvertDocx, onInstallDocx, onRefreshDocxImport, onSelectDocxPython, onOpenPythonDownload,
}: {
  availableUpdate: AppUpdateCandidate | null
  distribution: AppDistribution
  isAboutOpen: boolean
  isReadingSettingsOpen: boolean
  isDocxImportOpen: boolean
  docxImportPhase: 'checking' | 'idle' | 'installing' | 'converting'
  docxImportStatus: DocxImportStatus | null
  pendingDraft: RecoverableDraft | null
  readingPreferences: ReadingPreferences
  t: Translation
  updateErrorMessage: string | null
  updatePhase: AppUpdatePhase
  updateProgress: AppUpdateProgress | null
  onCheckUpdates: () => void
  onCloseAbout: () => void
  onCloseReadingSettings: () => void
  onDismissUpdate: () => void
  onDiscardDraft: () => void
  onInstallUpdate: () => void
  onOpenPortableDownload: () => void
  onRestoreDraft: () => void
  onUpdateReadingPreferences: (preferences: Partial<ReadingPreferences>) => void
  onCloseDocxImport: () => void
  onConvertDocx: () => void
  onInstallDocx: () => void
  onRefreshDocxImport: () => void
  onSelectDocxPython: () => void
  onOpenPythonDownload: () => void
}) {
  return <>
    <DraftRecoveryDialog draft={pendingDraft} onDiscard={onDiscardDraft} onRestore={onRestoreDraft} t={t} />
    <AboutDialog open={isAboutOpen} onClose={onCloseAbout} t={t} />
    {isReadingSettingsOpen ? <Suspense fallback={null}><ReadingSettingsDialog open preferences={readingPreferences} onClose={onCloseReadingSettings} onUpdate={onUpdateReadingPreferences} t={t} /></Suspense> : null}
    <UpdateDialog distribution={distribution} errorMessage={updateErrorMessage} onCheckAgain={onCheckUpdates} onClose={onDismissUpdate} onInstall={onInstallUpdate} onOpenPortableDownload={onOpenPortableDownload} phase={updatePhase} progress={updateProgress} t={t} update={availableUpdate} />
    <DocxImportDialog open={isDocxImportOpen} phase={docxImportPhase} status={docxImportStatus} t={t} onClose={onCloseDocxImport} onConvert={onConvertDocx} onInstall={onInstallDocx} onRefresh={onRefreshDocxImport} onSelectPython={onSelectDocxPython} onOpenPythonDownload={onOpenPythonDownload} />
  </>
}
