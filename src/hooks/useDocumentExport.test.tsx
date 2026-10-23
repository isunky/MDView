import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDocumentExport } from './useDocumentExport'
import { loadTranslation, translations } from '../i18n'
import type { FileAccess } from '../platform/fileAccess'
import { buildExportHtml } from '../domain/exportHtml'

vi.mock('../domain/exportHtml', () => ({ buildExportHtml: vi.fn(() => '<html>export</html>') }))
vi.mock('../domain/exportPreview', () => ({ createLightExportContent: async () => ({ html: '<p>content</p>', unresolvedResources: [] }) }))

describe('export workflow', () => {
  it.each(['ja', 'ko', 'es'] as const)('exports HTML with the %s language tag', async (language) => {
    const t = await loadTranslation(language)
    const { result } = renderHook(() => useDocumentExport({
      closeMenu: vi.fn(), document: { content: '# Content', path: null, title: 'test.md' },
      fileAccess: { exportHtmlFile: vi.fn(async () => null) } as unknown as FileAccess,
      language, previewRef: { current: document.createElement('article') }, setStatusMessage: vi.fn(), t,
    }))
    await act(async () => { await result.current.exportHtml() })
    expect(buildExportHtml).toHaveBeenLastCalledWith(expect.objectContaining({ lang: language }))
  })

  it('blocks overlapping exports and releases the lock after a canceled save', async () => {
    let complete!: (path: string | null) => void
    const exportHtmlFile = vi.fn(() => new Promise<string | null>((resolve) => { complete = resolve }))
    const printExportHtml = vi.fn()
    const preparePreview = vi.fn()
    const { result } = renderHook(() => useDocumentExport({
      closeMenu: vi.fn(), preparePreview, document: { content: '# Content', path: null, title: 'test.md' },
      fileAccess: { exportHtmlFile, printExportHtml } as unknown as FileAccess,
      language: 'en', previewRef: { current: document.createElement('article') }, setStatusMessage: vi.fn(), t: translations.en,
    }))
    let operation!: Promise<void>
    await act(async () => {
      operation = result.current.exportHtml()
      await result.current.exportPdf()
    })
    expect(exportHtmlFile).toHaveBeenCalledOnce()
    expect(printExportHtml).not.toHaveBeenCalled()
    expect(preparePreview).toHaveBeenCalledOnce()
    expect(result.current.isExporting).toBe(true)
    await act(async () => { complete(null); await operation })
    expect(result.current.isExporting).toBe(false)
    await act(async () => { await result.current.exportPdf() })
    expect(printExportHtml).toHaveBeenCalledOnce()
  })

  it('asks about Mermaid before generating Word, and allows choosing HTML', async () => {
    const exportHtmlFile = vi.fn(async () => '/tmp/diagram.html')
    const exportDocxFile = vi.fn()
    const { result } = renderHook(() => useDocumentExport({
      closeMenu: vi.fn(), document: { content: '```mermaid\nflowchart LR\nA-->B\n```', path: null, title: 'diagram.md' },
      fileAccess: { exportHtmlFile, exportDocxFile } as unknown as FileAccess,
      language: 'en', previewRef: { current: document.createElement('article') }, setStatusMessage: vi.fn(), t: translations.en,
    }))
    await act(async () => { await result.current.exportDocx() })
    expect(result.current.isWordWarningOpen).toBe(true)
    expect(exportDocxFile).not.toHaveBeenCalled()
    await act(async () => { await result.current.exportHtmlInstead() })
    expect(result.current.isWordWarningOpen).toBe(false)
    expect(result.current.lastExportPath).toBe('/tmp/diagram.html')
    expect(exportHtmlFile).toHaveBeenCalledOnce()
  })
})
