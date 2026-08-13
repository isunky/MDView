import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileAccess, MarkdownFileCheck, MarkdownFileWatchEvent } from '../platform/fileAccess'
import { useExternalFileMonitor } from './useExternalFileMonitor'

describe('useExternalFileMonitor', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('debounces native watch events without starting fallback polling', async () => {
    let notify: ((event: MarkdownFileWatchEvent) => void) | undefined
    const stop = vi.fn()
    const checkFile = vi.fn(async () => undefined)
    const fileAccess = createFileAccess({
      watchMarkdownFile: vi.fn(async (_path, callback) => {
        notify = callback
        return stop
      }),
    })
    const intervalSpy = vi.spyOn(window, 'setInterval')

    const { unmount } = renderHook(() => useExternalFileMonitor({
      enabled: true,
      path: '/tmp/readme.md',
      revision: 'saved',
      fileAccess,
      checkFile,
    }))
    await act(async () => Promise.resolve())

    act(() => {
      notify?.({ kind: 'changed', path: '/tmp/readme.md' })
      notify?.({ kind: 'changed', path: '/tmp/readme.md' })
      vi.advanceTimersByTime(249)
    })
    expect(checkFile).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(checkFile).toHaveBeenCalledTimes(1)
    expect(intervalSpy).not.toHaveBeenCalled()

    unmount()
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('serializes checks and performs one pending recheck', async () => {
    let notify: ((event: MarkdownFileWatchEvent) => void) | undefined
    let finishCheck: (() => void) | undefined
    const checkFile = vi.fn(() => new Promise<void>((resolve) => { finishCheck = resolve }))
    const fileAccess = createFileAccess({
      watchMarkdownFile: vi.fn(async (_path, callback) => {
        notify = callback
        return () => undefined
      }),
    })

    renderHook(() => useExternalFileMonitor({ enabled: true, path: '/tmp/readme.md', revision: 'saved', fileAccess, checkFile }))
    await act(async () => Promise.resolve())
    notify?.({ kind: 'changed', path: '/tmp/readme.md' })
    await act(async () => vi.advanceTimersByTimeAsync(250))
    notify?.({ kind: 'changed', path: '/tmp/readme.md' })
    await act(async () => vi.advanceTimersByTimeAsync(250))

    expect(checkFile).toHaveBeenCalledTimes(1)
    await act(async () => {
      finishCheck?.()
      await Promise.resolve()
    })
    expect(checkFile).toHaveBeenCalledTimes(2)
  })

  it('falls back to visible polling when native watching fails', async () => {
    const checkFile = vi.fn(async () => undefined)
    const fileAccess = createFileAccess({
      watchMarkdownFile: vi.fn(async () => { throw new Error('watch unavailable') }),
    })

    renderHook(() => useExternalFileMonitor({ enabled: true, path: '/tmp/readme.md', revision: 'saved', fileAccess, checkFile }))
    await act(async () => Promise.resolve())
    await act(async () => vi.advanceTimersByTimeAsync(2000))

    expect(checkFile).toHaveBeenCalledTimes(1)
  })

  it('disposes a watcher that reports an error before registration resolves', async () => {
    let notify: ((event: MarkdownFileWatchEvent) => void) | undefined
    let finishRegistration: ((dispose: () => void) => void) | undefined
    const stop = vi.fn()
    const checkFile = vi.fn(async () => undefined)
    const fileAccess = createFileAccess({
      watchMarkdownFile: vi.fn((_path, callback): Promise<() => void> => {
        notify = callback
        return new Promise((resolve) => { finishRegistration = resolve })
      }),
    })

    renderHook(() => useExternalFileMonitor({ enabled: true, path: '/tmp/readme.md', revision: 'saved', fileAccess, checkFile }))
    act(() => notify?.({ kind: 'error', path: '/tmp/readme.md' }))
    await act(async () => {
      finishRegistration?.(stop)
      await Promise.resolve()
    })
    await act(async () => vi.advanceTimersByTimeAsync(2000))

    expect(stop).toHaveBeenCalledTimes(1)
    expect(checkFile).toHaveBeenCalledTimes(1)
  })

  it('checks immediately when the window regains focus', async () => {
    const checkFile = vi.fn(async () => undefined)
    const fileAccess = createFileAccess({ watchMarkdownFile: undefined })

    renderHook(() => useExternalFileMonitor({ enabled: true, path: '/tmp/readme.md', revision: 'saved', fileAccess, checkFile }))
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })

    expect(checkFile).toHaveBeenCalledTimes(1)
  })
})

function createFileAccess(overrides: Pick<FileAccess, 'watchMarkdownFile'>): FileAccess {
  return {
    supportsNativeFiles: true,
    supportsImageImport: true,
    checkMarkdownFile: vi.fn(async (): Promise<MarkdownFileCheck> => ({ status: 'unchanged' })),
    openMarkdownFile: vi.fn(async () => null),
    openMarkdownFileAtPath: vi.fn(),
    revealFileInFolder: vi.fn(),
    saveMarkdownFile: vi.fn(),
    saveMarkdownFileAs: vi.fn(),
    exportHtmlFile: vi.fn(),
    exportDocxFile: vi.fn(),
    printExportHtml: vi.fn(),
    readLocalImageFile: vi.fn(),
    writeImageAsset: vi.fn(),
    readStartupMarkdownFile: vi.fn(async () => null),
    listenForOpenedFiles: vi.fn(async () => null),
    ...overrides,
  }
}
