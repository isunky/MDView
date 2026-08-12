import { useEffect, useRef, useState, type ComponentProps } from 'react'
import type { MarkdownPreviewLabels } from './previewTypes'

export function CodeBlock({ children, code, language, labels, ...props }: ComponentProps<'pre'> & {
  code: string
  language: string | null
  labels: MarkdownPreviewLabels
}) {
  const [copied, setCopied] = useState(false)
  const copiedTimeoutRef = useRef<number | null>(null)
  const visibleLanguage = language ? normalizeLanguageLabel(language) : null

  useEffect(() => () => {
    if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current)
  }, [])

  async function handleCopy() {
    await copyTextToClipboard(code.replace(/\n$/, ''))
    setCopied(true)
    if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current)
    copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <figure className="code-block">
      <figcaption className="code-block-header">
        <span>{visibleLanguage ?? labels.plainCodeBlock}</span>
        <button type="button" onClick={handleCopy}>{copied ? labels.copiedCode : labels.copyCode}</button>
      </figcaption>
      <pre aria-label={visibleLanguage ? labels.codeBlock(visibleLanguage) : labels.plainCodeBlock} {...props}>
        {children}
      </pre>
    </figure>
  )
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  try { document.execCommand('copy') } finally { textarea.remove() }
}

function normalizeLanguageLabel(language: string) {
  const aliases: Record<string, string> = {
    js: 'JavaScript', jsx: 'JSX', ts: 'TypeScript', tsx: 'TSX', py: 'Python',
    sh: 'Shell', bash: 'Bash', zsh: 'Zsh', ps1: 'PowerShell', md: 'Markdown',
    html: 'HTML', css: 'CSS', json: 'JSON', yaml: 'YAML', yml: 'YAML', rs: 'Rust',
  }
  return aliases[language.toLowerCase()] ?? language.toUpperCase()
}
