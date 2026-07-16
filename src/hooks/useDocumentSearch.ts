import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  findTextMatches,
  replaceAllTextMatches,
  replaceTextMatch,
} from '../domain/documentSearch'
import type { MarkdownEditorHandle } from '../components/MarkdownEditor'
import {
  detectShortcutPlatform,
  matchesShortcut,
} from '../platform/keyboardShortcuts'
import type { ReadingViewMode } from '../domain/readingSessions'

type UseDocumentSearchOptions = {
  content: string
  editorRef: RefObject<MarkdownEditorHandle | null>
  onContentChange: (content: string) => void
  viewMode: ReadingViewMode
}

export function useDocumentSearch({
  content,
  editorRef,
  onContentChange,
  viewMode,
}: UseDocumentSearchOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [isReplaceOpen, setIsReplaceOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [previewMatchCount, setPreviewMatchCount] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const sourceMatches = useMemo(() => findTextMatches(content, query), [content, query])
  const isSourceSearch = viewMode !== 'preview'
  const matchCount = isSourceSearch ? sourceMatches.length : previewMatchCount

  useEffect(() => {
    if (!isOpen || !isSourceSearch || sourceMatches.length === 0) {
      return
    }

    const match = sourceMatches[Math.min(activeIndex, sourceMatches.length - 1)]
    editorRef.current?.setSelection(match)
  }, [activeIndex, editorRef, isOpen, isSourceSearch, sourceMatches])

  useEffect(() => {
    const platform = detectShortcutPlatform()
    function handleKeyDown(event: KeyboardEvent) {
      if (!matchesShortcut(event, { key: 'f' }, platform)) {
        return
      }

      event.preventDefault()
      setIsOpen(true)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setIsReplaceOpen(false)
    setQuery('')
    setReplacement('')
    setActiveIndex(0)
    setPreviewMatchCount(0)
  }, [])

  const move = useCallback((direction: 1 | -1) => {
    if (matchCount === 0) {
      return
    }

    setActiveIndex((current) => (current + direction + matchCount) % matchCount)
  }, [matchCount])

  const replaceCurrent = useCallback(() => {
    if (!isSourceSearch || sourceMatches.length === 0) {
      return
    }

    const match = sourceMatches[Math.min(activeIndex, sourceMatches.length - 1)]
    onContentChange(replaceTextMatch(content, match, replacement))
  }, [activeIndex, content, isSourceSearch, onContentChange, replacement, sourceMatches])

  const replaceAll = useCallback(() => {
    if (!isSourceSearch || sourceMatches.length === 0) {
      return
    }

    onContentChange(replaceAllTextMatches(content, query, replacement))
  }, [content, isSourceSearch, onContentChange, query, replacement, sourceMatches.length])

  const setSearchQuery = useCallback((value: string) => {
    setQuery(value)
    setActiveIndex(0)
  }, [])

  const currentActiveIndex = matchCount === 0
    ? 0
    : Math.min(activeIndex, matchCount - 1)

  return {
    activeIndex: currentActiveIndex,
    close,
    inputRef,
    isOpen,
    isReplaceOpen,
    isSourceSearch,
    matchCount,
    move,
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
