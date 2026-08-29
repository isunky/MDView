import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations } from '../i18n'
import type { AppWindowFrame } from '../platform/windowFrame'
import { AppToolbar } from './AppToolbar'

describe('AppToolbar window frame', () => {
  it('drags and toggles maximize only from non-interactive titlebar areas', () => {
    const frame = createWindowFrame('macos-overlay')
    const { container } = renderToolbar(frame)
    const header = container.querySelector('header')!

    fireEvent.mouseDown(header, { button: 0, detail: 1 })
    fireEvent.mouseDown(header, { button: 0, detail: 2 })
    fireEvent.mouseDown(screen.getByRole('button', { name: 'File' }), { button: 0, detail: 1 })

    expect(frame.startDragging).toHaveBeenCalledOnce()
    expect(frame.toggleMaximize).toHaveBeenCalledOnce()
  })

  it('shows custom controls only for the Windows frame', () => {
    const { rerender } = renderToolbar(createWindowFrame('windows-custom'))
    expect(screen.getByRole('button', { name: 'Minimize' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()

    rerender(toolbar(createWindowFrame('macos-overlay')))
    expect(screen.queryByRole('button', { name: 'Minimize' })).not.toBeInTheDocument()
  })
})

function renderToolbar(frame: AppWindowFrame) {
  return render(toolbar(frame))
}

function toolbar(windowFrame: AppWindowFrame) {
  return <AppToolbar
    activeMenu={null}
    canRevealFiles={false}
    documentPath={null}
    documentTitle="Untitled.md"
    isSaving={false}
    isWelcomeVisible={false}
    language="en"
    menuBarRef={createRef<HTMLElement>()}
    recentFiles={[]}
    supportsAppUpdates={false}
    t={translations.en}
    updatePhase="idle"
    viewMode="preview"
    windowFrame={windowFrame}
    newTitle="New"
    openTitle="Open"
    saveTitle="Save"
    saveAsTitle="Save As"
    onAbout={vi.fn()}
    onCheckUpdates={vi.fn()}
    onClearRecent={vi.fn()}
    onExportDocx={vi.fn()}
    onExportHtml={vi.fn()}
    onExportPdf={vi.fn()}
    onLanguage={vi.fn()}
    onNew={vi.fn()}
    onOpen={vi.fn()}
    onOpenRecent={vi.fn()}
    onOpenReadingSettings={vi.fn()}
    onReveal={vi.fn()}
    onSave={vi.fn()}
    onSaveAs={vi.fn()}
    onToggleMenu={vi.fn()}
    onViewMode={vi.fn()}
  />
}

function createWindowFrame(kind: AppWindowFrame['kind']): AppWindowFrame {
  return {
    kind,
    close: vi.fn(async () => undefined),
    minimize: vi.fn(async () => undefined),
    startDragging: vi.fn(async () => undefined),
    toggleMaximize: vi.fn(async () => undefined),
    subscribeMaximized: vi.fn(async () => () => undefined),
  }
}
