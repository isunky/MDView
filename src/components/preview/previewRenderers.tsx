/* eslint-disable react-refresh/only-export-components */
import { Fragment, type ComponentProps, type ReactElement, type ReactNode } from 'react'

export function MarkdownTable({ children, ...props }: ComponentProps<'table'>) {
  return <div className="table-scroll" role="region" tabIndex={0}><table {...props}>{children}</table></div>
}

export function renderColorPreviews(children: ReactNode): ReactNode {
  if (typeof children === 'string') return renderTextWithColorPreviews(children)
  if (Array.isArray(children)) return children.map((child, index) => <Fragment key={index}>{renderColorPreviews(child)}</Fragment>)
  return children
}

export function ColorValuePreview({ value }: { value: string }) {
  return <span className="color-preview-value">{value}<span className="color-preview-swatch" style={{ backgroundColor: value }} aria-label={`Color preview ${value}`} /></span>
}

export function isHexColorValue(value: string) {
  return /^#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value)
}

export function getCodeBlockMetadata(children: ReactNode): { language: string | null; code: string } {
  if (!isReactElementWithProps(children)) return { language: null, code: getReactNodeText(children) }
  const className = children.props.className
  return {
    language: typeof className === 'string' ? className.split(/\s+/).find((part) => part.startsWith('language-'))?.replace(/^language-/, '') ?? null : null,
    code: getReactNodeText(children.props.children),
  }
}

export function getMermaidChart(children: ReactNode): string | null {
  if (!isReactElementWithProps(children)) return null
  const className = children.props.className
  if (typeof className !== 'string' || !/\blanguage-mermaid\b/.test(className)) return null
  return getReactNodeText(children.props.children).trim() || null
}

export function getReactNodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getReactNodeText).join('')
  if (isReactElementWithProps(node)) return getReactNodeText(node.props.children)
  return ''
}

function renderTextWithColorPreviews(text: string): ReactNode {
  const pattern = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(<ColorValuePreview key={`${match[0]}-${match.index}`} value={match[0]} />)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : text
}

function isReactElementWithProps(value: ReactNode): value is ReactElement<{ className?: unknown; children?: ReactNode }> {
  return typeof value === 'object' && value !== null && 'props' in value
}
