import { Check, Sigma, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { MathDisplayMode } from '../domain/markdownMath'

export type MathEditorDialogLabels = {
  mathDialogTitle: string
  mathInlineMode: string
  mathBlockMode: string
  mathLatexLabel: string
  mathPreviewLabel: string
  mathTemplatesLabel: string
  mathInsert: string
  mathUpdate: string
  mathCancel: string
  mathInvalid: string
}

type MathTemplate = { label: string; latex: string }

const templates: MathTemplate[] = [
  { label: 'x²', latex: 'x^{2}' },
  { label: 'xₙ', latex: 'x_{n}' },
  { label: 'a⁄b', latex: '\\frac{a}{b}' },
  { label: '√x', latex: '\\sqrt{x}' },
  { label: 'Σ', latex: '\\sum_{i=1}^{n} i' },
  { label: '∫', latex: '\\int_{0}^{1} f(x)\\,dx' },
  { label: 'α β', latex: '\\alpha + \\beta' },
  { label: '[ ]', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
  { label: '{', latex: 'f(x)=\\begin{cases} x, & x \\ge 0 \\\\ -x, & x < 0 \\end{cases}' },
]

export function MathEditorDialog({
  initialLatex,
  initialMode,
  isEditing,
  labels,
  open,
  onClose,
  onConfirm,
}: {
  initialLatex: string
  initialMode: MathDisplayMode
  isEditing: boolean
  labels: MathEditorDialogLabels
  open: boolean
  onClose: () => void
  onConfirm: (latex: string, mode: MathDisplayMode) => void
}) {
  const [latex, setLatex] = useState(initialLatex)
  const [mode, setMode] = useState(initialMode)
  const [previewHtml, setPreviewHtml] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!open) return
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [open])

  useEffect(() => {
    if (!open || !latex.trim()) {
      return
    }
    let active = true
    void import('katex').then(({ default: katex }) => {
      if (!active) return
      try {
        setPreviewHtml(katex.renderToString(latex, {
          displayMode: mode === 'block', output: 'htmlAndMathml', throwOnError: true, trust: false,
        }))
        setError('')
      } catch {
        setPreviewHtml('')
        setError(labels.mathInvalid)
      }
    })
    void import('katex/dist/katex.min.css')
    return () => { active = false }
  }, [labels.mathInvalid, latex, mode, open])

  const visibleError = latex.trim() ? error : ''
  const visiblePreviewHtml = latex.trim() ? previewHtml : ''
  const canConfirm = useMemo(() => Boolean(latex.trim()) && !visibleError, [latex, visibleError])

  function insertTemplate(value: string) {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? latex.length
    const end = textarea?.selectionEnd ?? start
    const next = `${latex.slice(0, start)}${value}${latex.slice(end)}`
    setLatex(next)
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(start + value.length, start + value.length)
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && canConfirm) {
      event.preventDefault()
      onConfirm(latex, mode)
    }
  }

  if (!open) return null
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="math-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="math-editor-title">
        <button type="button" className="about-close" onClick={onClose} aria-label={labels.mathCancel}><X aria-hidden="true" /></button>
        <header className="math-editor-header"><span className="math-editor-mark"><Sigma aria-hidden="true" /></span><h2 id="math-editor-title">{labels.mathDialogTitle}</h2></header>
        <div className="math-mode-control" role="radiogroup" aria-label={labels.mathDialogTitle}>
          <button type="button" role="radio" aria-checked={mode === 'inline'} className={mode === 'inline' ? 'active' : ''} onClick={() => setMode('inline')}>{labels.mathInlineMode}</button>
          <button type="button" role="radio" aria-checked={mode === 'block'} className={mode === 'block' ? 'active' : ''} onClick={() => setMode('block')}>{labels.mathBlockMode}</button>
        </div>
        <label className="math-editor-field"><span>{labels.mathLatexLabel}</span><textarea ref={textareaRef} value={latex} spellCheck={false} onChange={(event) => setLatex(event.target.value)} onKeyDown={handleKeyDown} /></label>
        <div className="math-template-section"><span>{labels.mathTemplatesLabel}</span><div className="math-template-grid">{templates.map((template) => <button type="button" key={template.latex} title={template.latex} onClick={() => insertTemplate(template.latex)}>{template.label}</button>)}</div></div>
        <div className="math-preview-section"><span>{labels.mathPreviewLabel}</span><div className={`math-live-preview${visibleError ? ' invalid' : ''}`}>{visibleError || (visiblePreviewHtml ? <span dangerouslySetInnerHTML={{ __html: visiblePreviewHtml }} /> : null)}</div></div>
        <footer className="math-editor-actions"><button type="button" className="secondary" onClick={onClose}>{labels.mathCancel}</button><button type="button" className="primary" disabled={!canConfirm} onClick={() => onConfirm(latex, mode)}><Check aria-hidden="true" />{isEditing ? labels.mathUpdate : labels.mathInsert}</button></footer>
      </section>
    </div>
  )
}
