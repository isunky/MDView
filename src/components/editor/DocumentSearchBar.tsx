import { ChevronDown, ChevronUp, Replace, Search, X } from 'lucide-react'
import { useEffect, type KeyboardEvent, type RefObject } from 'react'

export type DocumentSearchLabels = {
  clear: string
  close: string
  find: string
  findInPreview: string
  findInSource: string
  matchCount: (current: number, total: number) => string
  noResults: string
  searching: string
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
  isSearchPending: boolean
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
  isSearchPending,
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
      if (event.key === 'Escape' && !event.defaultPrevented && !event.isComposing && !inputRef.current?.closest('[inert]')) {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inputRef, isOpen, onClose])

  if (!isOpen) {
    return null
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    onMove(event.shiftKey ? -1 : 1)
  }

  return (
    <section id="document-search-panel" className={`document-search${query && !isSearchPending && matchCount === 0 ? ' no-results' : ''}`} aria-label={labels.find}>
      <div className="document-search-row">
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          aria-label={labels.find}
          placeholder={isSourceSearch ? labels.findInSource : labels.findInPreview}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          onKeyDown={handleSearchKeyDown}
        />
        {query ? <button type="button" className="document-search-clear" onClick={() => { onQueryChange(''); inputRef.current?.focus() }} aria-label={labels.clear} title={labels.clear}>
          <X aria-hidden="true" />
        </button> : null}
        <span className="document-search-count" role="status" aria-live="polite" aria-atomic="true">
          {query ? isSearchPending ? labels.searching : matchCount === 0 ? labels.noResults : labels.matchCount(activeIndex + 1, matchCount) : null}
        </span>
        <button type="button" onClick={() => onMove(-1)} disabled={matchCount === 0} aria-label={labels.previous} title={`${labels.previous} (Shift+Enter)`}>
          <ChevronUp aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={matchCount === 0} aria-label={labels.next} title={`${labels.next} (Enter)`}>
          <ChevronDown aria-hidden="true" />
        </button>
        {isSourceSearch ? (
          <button type="button" className={isReplaceOpen ? 'active' : ''} onClick={onToggleReplace} aria-expanded={isReplaceOpen} aria-controls="document-replace-row" aria-label={labels.toggleReplace} title={labels.toggleReplace}>
            <Replace aria-hidden="true" />
          </button>
        ) : null}
        <button type="button" onClick={onClose} aria-label={labels.close} title={`${labels.close} (Esc)`}>
          <X aria-hidden="true" />
        </button>
      </div>
      {isSourceSearch && isReplaceOpen ? (
        <div className="document-search-row document-replace-row" id="document-replace-row">
          <Replace aria-hidden="true" />
          <input
            aria-label={labels.replacement}
            placeholder={labels.replacement}
            value={replacement}
            onChange={(event) => onReplacementChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault()
                onReplaceCurrent()
              }
            }}
          />
          <button type="button" onClick={onReplaceCurrent} disabled={matchCount === 0}>
            {labels.replaceCurrent}
          </button>
          <button type="button" onClick={onReplaceAll} disabled={matchCount === 0}>
            {labels.replaceAll}
          </button>
        </div>
      ) : null}
      <div className="document-search-help" aria-hidden="true">
        <span>{isSourceSearch ? labels.findInSource : labels.findInPreview}</span>
        <span><kbd>Enter</kbd> / <kbd>Shift+Enter</kbd></span>
      </div>
    </section>
  )
}
