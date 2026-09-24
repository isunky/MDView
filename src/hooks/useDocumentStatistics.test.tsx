import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDocumentStatistics, type DocumentStatistics } from '../domain/documentStatistics'
import { useDocumentStatistics } from './useDocumentStatistics'

type StatisticsRequest = { requestId: number; content: string }
type StatisticsResponse = { requestId: number; statistics: DocumentStatistics }

class MockWorker {
  static instances: MockWorker[] = []

  onmessage: ((event: MessageEvent<StatisticsResponse>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postedMessages: StatisticsRequest[] = []
  terminate = vi.fn()

  constructor() {
    MockWorker.instances.push(this)
  }

  postMessage(message: StatisticsRequest) {
    this.postedMessages.push(message)
  }
}

describe('useDocumentStatistics', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    MockWorker.instances = []
    vi.stubGlobal('Worker', MockWorker)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('posts only the latest content after the debounce interval', () => {
    const { rerender } = renderHook(({ content }) => useDocumentStatistics(content), {
      initialProps: { content: 'initial' },
    })
    const worker = MockWorker.instances[0]

    act(() => vi.advanceTimersByTime(200))
    rerender({ content: 'latest content' })
    act(() => vi.advanceTimersByTime(249))
    expect(worker.postedMessages).toHaveLength(0)

    act(() => vi.advanceTimersByTime(1))
    expect(worker.postedMessages).toHaveLength(1)
    expect(worker.postedMessages[0].content).toBe('latest content')
  })

  it('ignores responses for content that has since changed', () => {
    const { result, rerender } = renderHook(({ content }) => useDocumentStatistics(content), {
      initialProps: { content: 'old content' },
    })
    const worker = MockWorker.instances[0]

    act(() => vi.advanceTimersByTime(250))
    const staleRequest = worker.postedMessages[0]
    rerender({ content: 'new content' })

    act(() => worker.onmessage?.({
      data: { requestId: staleRequest.requestId, statistics: getDocumentStatistics('old content') },
    } as MessageEvent<StatisticsResponse>))
    expect(result.current).toEqual({ characterCount: 0, wordCount: 0, readingMinutes: 0 })

    act(() => vi.advanceTimersByTime(250))
    const latestRequest = worker.postedMessages[1]
    const expected = getDocumentStatistics('new content')
    act(() => worker.onmessage?.({
      data: { requestId: latestRequest.requestId, statistics: expected },
    } as MessageEvent<StatisticsResponse>))
    expect(result.current).toEqual(expected)
  })

  it('falls back to a debounced main-thread calculation when workers are unavailable', () => {
    vi.stubGlobal('Worker', undefined)
    const content = 'fallback calculation'
    const { result } = renderHook(() => useDocumentStatistics(content))

    expect(result.current).toEqual({ characterCount: 0, wordCount: 0, readingMinutes: 0 })
    act(() => vi.advanceTimersByTime(249))
    expect(result.current).toEqual({ characterCount: 0, wordCount: 0, readingMinutes: 0 })
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toEqual(getDocumentStatistics(content))
  })

  it('uses a debounced fallback if the worker fails', () => {
    const content = 'worker failure fallback'
    const { result } = renderHook(() => useDocumentStatistics(content))
    const worker = MockWorker.instances[0]

    act(() => vi.advanceTimersByTime(250))
    act(() => worker.onerror?.({} as ErrorEvent))
    expect(worker.terminate).toHaveBeenCalledOnce()
    act(() => vi.advanceTimersByTime(249))
    expect(result.current).toEqual({ characterCount: 0, wordCount: 0, readingMinutes: 0 })
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toEqual(getDocumentStatistics(content))
  })
})
