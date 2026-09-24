import { ChevronDown, ChevronUp, Replace, Search, X } from 'lucide-react'
import { useEffect, type KeyboardEvent, type RefObject } from 'react'

export type DocumentSearchLabels = {
  close: string
  find: string
  matchCount: (current: number, total: number) => string
  next: string
  previous: string
  replace: string
  replaceAll: string
  replaceCurrent: string
  replacement: string
  toggleReplace: string
}

type DocumentSearchBarProps = {
  activeIndex: number
  inputRef: RefObject<HTMLInputElement | null>
  isOpen: boolean
  isReplaceOpen: boolean
  isSourceSearch: boolean
  labels: DocumentSearchLabels
  matchCount: number
  onClose: () => void
  onMove: (direction: 1 | -1) => void
  onQueryChange: (value: string) => void
  onReplaceAll: () => void
  onReplaceCurrent: () => void
  onReplacementChange: (value: string) => void
  onToggleReplace: () => void
  query: string
  replacement: string
}

export function DocumentSearchBar({
  activeIndex,
  inputRef,
  isOpen,
  isReplaceOpen,
  isSourceSearch,
  labels,
  matchCount,
  onClose,
  onMove,
  onQueryChange,
  onReplaceAll,
  onReplaceCurrent,
  onReplacementChange,
  onToggleReplace,
  query,
  replacement,
}: DocumentSearchBarProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    onMove(event.shiftKey ? -1 : 1)
  }

  return (
    <section className="document-search" aria-label={labels.find}>
      <div className="document-search-row">
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          aria-label={labels.find}
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          onKeyDown={handleSearchKeyDown}
        />
        <span className="document-search-count" aria-live="polite">
          {labels.matchCount(matchCount === 0 ? 0 : activeIndex + 1, matchCount)}
        </span>
        <button type="button" onClick={() => onMove(-1)} aria-label={labels.previous} title={labels.previous}>
          <ChevronUp aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onMove(1)} aria-label={labels.next} title={labels.next}>
          <ChevronDown aria-hidden="true" />
        </button>
        {isSourceSearch ? (
          <button type="button" onClick={onToggleReplace} aria-label={labels.toggleReplace} title={labels.toggleReplace}>
            <Replace aria-hidden="true" />
          </button>
        ) : null}
        <button type="button" onClick={onClose} aria-label={labels.close} title={labels.close}>
          <X aria-hidden="true" />
        </button>
      </div>
      {isSourceSearch && isReplaceOpen ? (
        <div className="document-search-row document-replace-row">
          <Replace aria-hidden="true" />
          <input
            aria-label={labels.replacement}
            value={replacement}
            onChange={(event) => onReplacementChange(event.currentTarget.value)}
          />
          <button type="button" onClick={onReplaceCurrent} disabled={matchCount === 0}>
            {labels.replaceCurrent}
          </button>
          <button type="button" onClick={onReplaceAll} disabled={matchCount === 0}>
            {labels.replaceAll}
          </button>
        </div>
      ) : null}
    </section>
  )
}
