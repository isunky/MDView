import { Check, Copy, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { MarkdownSyntaxSection } from '../domain/markdownSyntaxReference'

export type MarkdownSyntaxDialogProps = {
  open: boolean
  title: string
  intro: string
  categoriesLabel: string
  safetyNote: string
  sections: MarkdownSyntaxSection[]
  copyLabel: (name: string) => string
  copiedLabel: (name: string) => string
  copyFailedLabel: string
  closeLabel: string
  onClose: () => void
}

export function MarkdownSyntaxDialog({ open, title, intro, categoriesLabel, safetyNote, sections, copyLabel, copiedLabel, copyFailedLabel, closeLabel, onClose }: MarkdownSyntaxDialogProps) {
  const [copyStatus, setCopyStatus] = useState<{ itemId: string; state: 'copied' | 'failed'; message: string } | null>(null)
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? '')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0]

  const handleClose = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    setCopyStatus(null)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && handleClose()
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, open])

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  function selectSection(sectionId: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    setCopyStatus(null)
    setActiveSectionId(sectionId)
  }

  function handleSectionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null
    if (event.key === 'ArrowRight') next = (index + 1) % sections.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + sections.length) % sections.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = sections.length - 1
    if (next === null) return
    event.preventDefault()
    selectSection(sections[next].id)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }

  async function handleCopy(itemId: string, name: string, syntax: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    try {
      await navigator.clipboard.writeText(syntax)
      setCopyStatus({ itemId, state: 'copied', message: copiedLabel(name) })
    } catch {
      setCopyStatus({ itemId, state: 'failed', message: copyFailedLabel })
    }
    timeoutRef.current = setTimeout(() => { setCopyStatus(null); timeoutRef.current = null }, 1800)
  }

  if (!open) return null
  return <div className="dialog-backdrop" onMouseDown={(event) => event.currentTarget === event.target && handleClose()}>
    <section className="syntax-dialog" role="dialog" aria-modal="true" aria-labelledby="syntax-reference-title">
      <button type="button" className="about-close" onClick={handleClose} aria-label={closeLabel}><X aria-hidden="true" /></button>
      <header className="syntax-dialog-header"><h2 id="syntax-reference-title">{title}</h2><p>{intro}</p><p className="syntax-copy-status" data-state={copyStatus?.state ?? 'idle'} role="status" aria-live="polite">{copyStatus?.message ?? ''}</p></header>
      <div className="syntax-reference-tabs" role="tablist" aria-label={categoriesLabel}>{sections.map((section, index) => {
        const active = section.id === activeSection?.id
        return <button type="button" role="tab" id={`syntax-tab-${section.id}`} aria-selected={active} aria-controls={`syntax-panel-${section.id}`} tabIndex={active ? 0 : -1} key={section.id} onClick={() => selectSection(section.id)} onKeyDown={(event) => handleSectionKeyDown(event, index)}>{section.title}</button>
      })}</div>
      <div className="syntax-dialog-body">{activeSection ? <section className="syntax-reference-section" role="tabpanel" id={`syntax-panel-${activeSection.id}`} aria-labelledby={`syntax-tab-${activeSection.id}`} tabIndex={0}>
        <h3>{activeSection.title}</h3><div className="syntax-reference-grid">{activeSection.items.map((item) => {
          const copied = copyStatus?.itemId === item.id && copyStatus.state === 'copied'
          return <div className="syntax-reference-row" key={item.id}><div className="syntax-reference-example"><strong>{item.name}</strong><code>{item.syntax}</code></div><p>{item.description}</p><button type="button" className="syntax-copy-button" aria-label={copied ? copiedLabel(item.name) : copyLabel(item.name)} title={copied ? copiedLabel(item.name) : copyLabel(item.name)} onClick={() => void handleCopy(item.id, item.name, item.syntax)}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button></div>
        })}</div>
      </section> : null}{activeSection?.id === 'mdview-enhancements' ? <p className="syntax-safety-note">{safetyNote}</p> : null}</div>
    </section>
  </div>
}
