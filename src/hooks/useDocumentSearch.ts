import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  findTextMatches,
  replaceTextMatch,
  replaceTextMatches,
} from '../domain/documentSearch'
import type { MarkdownEditorHandle } from '../components/editor/MarkdownEditor'
import {
  detectShortcutPlatform,
  matchesShortcut,
} from '../platform/keyboardShortcuts'
import type { ReadingViewMode } from '../domain/readingSessions'

const SEARCH_QUERY_DEBOUNCE_MS = 120

type UseDocumentSearchOptions = {
  enabled?: boolean
  content: string
  editorRef: RefObject<MarkdownEditorHandle | null>
  onContentChange: (content: string) => void
  onOpen?: () => void
  viewMode: ReadingViewMode
}

export function useDocumentSearch({
  enabled = true,
  content,
  editorRef,
  onContentChange,
  onOpen,
  viewMode,
}: UseDocumentSearchOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [isReplaceOpen, setIsReplaceOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [previewMatchResult, setPreviewMatchResult] = useState({ query: '', count: 0 })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSourceSearch = viewMode !== 'preview'
  const isSearchPending = query !== appliedQuery
  const sourceMatches = useMemo(
    () => isSourceSearch && !isSearchPending && appliedQuery ? findTextMatches(content, appliedQuery) : [],
    [appliedQuery, content, isSearchPending, isSourceSearch],
  )
  const previewMatchCount = previewMatchResult.query === appliedQuery ? previewMatchResult.count : 0
  const matchCount = isSearchPending ? 0 : isSourceSearch ? sourceMatches.length : previewMatchCount

  useEffect(() => {
    if (query === appliedQuery) return
    const timeout = window.setTimeout(() => setAppliedQuery(query), SEARCH_QUERY_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [appliedQuery, query])

  const setPreviewMatchCount = useCallback((count: number) => {
    setPreviewMatchResult((current) => (
      current.query === appliedQuery && current.count === count
        ? current
        : { query: appliedQuery, count }
    ))
  }, [appliedQuery])

  useEffect(() => {
    if (!isOpen || !isSourceSearch || isSearchPending || sourceMatches.length === 0) {
      return
    }

    const match = sourceMatches[Math.min(activeIndex, sourceMatches.length - 1)]
    if (document.activeElement === editorRef.current?.getScrollElement()) return
    editorRef.current?.setSelection(match, { focus: false })
  }, [activeIndex, editorRef, isOpen, isSearchPending, isSourceSearch, sourceMatches])

  const open = useCallback(() => {
    if (!enabled) return
    if (!isOpen) {
      const current = document.activeElement as HTMLElement | null
      previousFocusRef.current = current?.closest('.action-menu')?.querySelector<HTMLElement>('[data-menu-trigger]') ?? current
    }
    onOpen?.()
    setIsOpen(true)
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
    focusTimerRef.current = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }, [enabled, isOpen, onOpen])

  useEffect(() => () => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
  }, [])

  useEffect(() => {
    const platform = detectShortcutPlatform()
    function handleKeyDown(event: KeyboardEvent) {
      if (!enabled || event.defaultPrevented || !matchesShortcut(event, { key: 'f' }, platform)) {
        return
      }

      event.preventDefault()
      open()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, open])

  const close = useCallback(() => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
    const previousFocus = previousFocusRef.current
    if (previousFocus?.isConnected && previousFocus !== document.body && !previousFocus.closest('[inert]')) previousFocus.focus()
    else document.querySelector<HTMLButtonElement>('[data-menu-trigger="reading"]')?.focus()
    setIsOpen(false)
    setIsReplaceOpen(false)
    setQuery('')
    setAppliedQuery('')
    setReplacement('')
    setActiveIndex(0)
    setPreviewMatchResult({ query: '', count: 0 })
  }, [])

  const move = useCallback((direction: 1 | -1) => {
    if (matchCount === 0) {
      return
    }

    setActiveIndex((current) => (Math.min(current, matchCount - 1) + direction + matchCount) % matchCount)
  }, [matchCount])

  const replaceCurrent = useCallback(() => {
    if (!isSourceSearch || isSearchPending || sourceMatches.length === 0) {
      return
    }

    const match = sourceMatches[Math.min(activeIndex, sourceMatches.length - 1)]
    onContentChange(replaceTextMatch(content, match, replacement))
  }, [activeIndex, content, isSearchPending, isSourceSearch, onContentChange, replacement, sourceMatches])

  const replaceAll = useCallback(() => {
    if (!isSourceSearch || isSearchPending || sourceMatches.length === 0) {
      return
    }

    onContentChange(replaceTextMatches(content, sourceMatches, replacement))
  }, [content, isSearchPending, isSourceSearch, onContentChange, replacement, sourceMatches])

  const setSearchQuery = useCallback((value: string) => {
    setQuery(value)
    setActiveIndex(0)
    if (!value) {
      setAppliedQuery('')
      setPreviewMatchResult({ query: '', count: 0 })
    }
  }, [])

  const currentActiveIndex = matchCount === 0
    ? 0
    : Math.min(activeIndex, matchCount - 1)

  return {
    activeSourceMatch: isOpen && isSourceSearch ? sourceMatches[currentActiveIndex] ?? null : null,
    activeIndex: currentActiveIndex,
    close,
    appliedQuery,
    inputRef,
    isOpen,
    isReplaceOpen,
    isSourceSearch,
    matchCount,
    move,
    open,
    isSearchPending,
    query,
    replacement,
    replaceAll,
    replaceCurrent,
    setIsOpen,
    setIsReplaceOpen,
    setPreviewMatchCount,
    setQuery: setSearchQuery,
    setReplacement,
  }
}
