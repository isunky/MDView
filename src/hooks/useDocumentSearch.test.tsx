import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { findTextMatchesMock, replaceTextMatchesMock } = vi.hoisted(() => ({
  findTextMatchesMock: vi.fn(),
  replaceTextMatchesMock: vi.fn((content: string) => content),
}))

vi.mock('../domain/documentSearch', () => ({
  findTextMatches: findTextMatchesMock,
  replaceTextMatch: vi.fn((content: string) => content),
  replaceTextMatches: replaceTextMatchesMock,
}))

import { useDocumentSearch } from './useDocumentSearch'

describe('useDocumentSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    findTextMatchesMock.mockReset()
    replaceTextMatchesMock.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces queries and skips source scans in preview mode', () => {
    const { result } = renderHook(() => useDocumentSearch({
      content: 'A long Markdown document',
      editorRef: { current: null },
      onContentChange: vi.fn(),
      viewMode: 'preview',
    }))

    act(() => result.current.setQuery('markdown'))
    expect(result.current.query).toBe('markdown')
    expect(result.current.appliedQuery).toBe('')
    expect(findTextMatchesMock).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(120))
    expect(result.current.appliedQuery).toBe('markdown')
    expect(result.current.matchCount).toBe(0)
    expect(findTextMatchesMock).not.toHaveBeenCalled()
  })

  it('scans source text once after the query settles in edit mode', () => {
    const matches = [{ start: 2, end: 8 }, { start: 12, end: 18 }]
    findTextMatchesMock.mockReturnValue(matches)
    const { result } = renderHook(() => useDocumentSearch({
      content: 'A long Markdown document',
      editorRef: { current: null },
      onContentChange: vi.fn(),
      viewMode: 'edit',
    }))

    act(() => result.current.setQuery('markdown'))
    expect(findTextMatchesMock).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(120))
    expect(findTextMatchesMock).toHaveBeenCalledTimes(1)
    expect(findTextMatchesMock).toHaveBeenCalledWith('A long Markdown document', 'markdown')
    expect(result.current.matchCount).toBe(2)
  })

  it('reuses source matches when replacing all results', () => {
    const content = 'A long Markdown document'
    const matches = [{ start: 2, end: 8 }, { start: 12, end: 18 }]
    const onContentChange = vi.fn()
    findTextMatchesMock.mockReturnValue(matches)
    const { result } = renderHook(() => useDocumentSearch({
      content,
      editorRef: { current: null },
      onContentChange,
      viewMode: 'edit',
    }))

    act(() => result.current.setQuery('markdown'))
    act(() => vi.advanceTimersByTime(120))
    act(() => result.current.setReplacement('MD'))
    act(() => result.current.replaceAll())

    expect(findTextMatchesMock).toHaveBeenCalledTimes(1)
    expect(replaceTextMatchesMock).toHaveBeenCalledWith(content, matches, 'MD')
  })
})
