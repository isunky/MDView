import {
  Fragment,
  memo,
  useCallback,
  useMemo,
  useId,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import { createPortal } from 'react-dom'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/github.css'
import {
  resolveLocalMarkdownResource,
  resolveSameDocumentHeading,
} from '../domain/localMarkdownResources'
import {
  markdownSanitizeSchema,
  rehypeSafeHeadingIds,
} from '../domain/markdownSanitize'
import {
  isExternalWebUrl,
  openExternalLink,
  type OpenExternalLink,
} from '../platform/externalLinks'
import type { FileAccess } from '../platform/fileAccess'
import { renderMermaidDiagram, sanitizeMermaidSvg } from '../domain/mermaidRenderer'

type MarkdownPreviewProps = {
  content: string
  previewRef?: Ref<HTMLElement>
  sourcePath?: string | null
  readLocalImageFile?: FileAccess['readLocalImageFile']
  onOpenMarkdownLink?: (path: string, headingId?: string) => void
  onOpenExternalLink?: OpenExternalLink
  labels?: MarkdownPreviewLabels
  searchQuery?: string
  activeSearchIndex?: number
  onSearchMatchCountChange?: (count: number) => void
}

export type MarkdownPreviewLabels = {
  copyCode: string
  copiedCode: string
  plainCodeBlock: string
  codeBlock: (language: string) => string
  mermaidDiagram: string
  mermaidLoading: string
  mermaidError: string
  imagePreview: string
  closeImagePreview: string
  imagePreviewAlt: (alt: string) => string
}

export const MarkdownPreview = memo(function MarkdownPreview({
  content,
  previewRef,
  sourcePath,
  readLocalImageFile,
  onOpenMarkdownLink,
  onOpenExternalLink = openExternalLink,
  labels = defaultPreviewLabels,
  searchQuery = '',
  activeSearchIndex = 0,
  onSearchMatchCountChange,
}: MarkdownPreviewProps) {
  const articleRef = useRef<HTMLElement | null>(null)
  const searchHighlightPlugin = useMemo(
    () => createSearchHighlightPlugin(searchQuery),
    [searchQuery],
  )
  const setPreviewRef = useCallback((element: HTMLElement | null) => {
    articleRef.current = element
    assignRef(previewRef, element)
  }, [previewRef])

  useEffect(() => {
    const article = articleRef.current
    if (!article) {
      onSearchMatchCountChange?.(0)
      return
    }

    const matches = Array.from(article.querySelectorAll<HTMLElement>('[data-mdview-search-match]'))
    onSearchMatchCountChange?.(matches.length)
    matches.forEach((match, index) => {
      const isActive = index === activeSearchIndex
      match.classList.toggle('search-match-active', isActive)
      if (isActive && matches.length > 0) {
        match.scrollIntoView?.({ block: 'center', behavior: 'auto' })
      }
    })
  }, [activeSearchIndex, content, onSearchMatchCountChange, searchQuery])

  return (
    <article className="markdown-preview" aria-label="Markdown preview" ref={setPreviewRef}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, markdownSanitizeSchema],
          rehypeSafeHeadingIds,
          rehypeHighlight,
          searchHighlightPlugin,
        ]}
        urlTransform={transformMarkdownUrl}
        components={{
          pre({ children, node, ...props }) {
            void node
            const mermaidChart = getMermaidChart(children)

            if (mermaidChart) {
              return <MermaidDiagram chart={mermaidChart} labels={labels} />
            }

            const codeMetadata = getCodeBlockMetadata(children)
            return (
              <CodeBlock
                code={codeMetadata.code}
                language={codeMetadata.language}
                labels={labels}
                {...props}
              >
                {children}
              </CodeBlock>
            )
          },
          table({ children, node, ...props }) {
            void node
            return <MarkdownTable {...props}>{children}</MarkdownTable>
          },
          p({ children, node, ...props }) {
            void node
            return <p {...props}>{renderColorPreviews(children)}</p>
          },
          li({ children, node, ...props }) {
            void node
            return <li {...props}>{renderColorPreviews(children)}</li>
          },
          td({ children, node, ...props }) {
            void node
            return <td {...props}>{renderColorPreviews(children)}</td>
          },
          th({ children, node, ...props }) {
            void node
            return <th {...props}>{renderColorPreviews(children)}</th>
          },
          code({ children, className, node, ...props }) {
            void node
            const codeText = getReactNodeText(children)
            const isInlineColor = !className && isHexColorValue(codeText)

            return (
              <code className={className} {...props}>
                {isInlineColor ? <ColorValuePreview value={codeText} /> : children}
              </code>
            )
          },
          a({ href, children, node, ...props }) {
            void node
            function handleClick(event: MouseEvent<HTMLAnchorElement>) {
              const sameDocumentHeading = resolveSameDocumentHeading(href)
              if (sameDocumentHeading) {
                event.preventDefault()
                window.document
                  .getElementById(sameDocumentHeading)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                return
              }

              const resource = resolveLocalMarkdownResource(href, sourcePath)
              if (resource?.kind === 'markdown') {
                event.preventDefault()
                onOpenMarkdownLink?.(resource.path, resource.headingId)
                return
              }

              if (isExternalWebUrl(href)) {
                event.preventDefault()
                void Promise.resolve(onOpenExternalLink(href)).catch((error) => {
                  console.error('Failed to open external link', error)
                })
              }
            }

            return (
              <a
                href={href}
                onClick={handleClick}
                target={isExternalWebUrl(href) ? '_blank' : undefined}
                rel={isExternalWebUrl(href) ? 'noreferrer' : undefined}
                {...props}
              >
                {children}
              </a>
            )
          },
          img({ src, alt, node, ...props }) {
            void node
            return (
              <LocalMarkdownImage
                src={src}
                alt={alt}
                sourcePath={sourcePath}
                readLocalImageFile={readLocalImageFile}
                labels={labels}
                {...props}
              />
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
})

type SearchTreeNode = {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  value?: string
  children?: SearchTreeNode[]
}

function createSearchHighlightPlugin(query: string) {
  const expression = query ? new RegExp(escapeRegularExpression(query), 'giu') : null

  return () => (tree: SearchTreeNode) => {
    if (!expression) {
      return
    }

    let matchIndex = 0
    highlightSearchMatches(tree, expression, () => matchIndex++)
  }
}

function highlightSearchMatches(
  node: SearchTreeNode,
  expression: RegExp,
  nextMatchIndex: () => number,
) {
  if (!node.children || shouldSkipSearchHighlight(node)) {
    return
  }

  node.children = node.children.flatMap((child) => {
    if (child.type !== 'text' || !child.value) {
      highlightSearchMatches(child, expression, nextMatchIndex)
      return child
    }

    return splitSearchTextNode(child.value, expression, nextMatchIndex)
  })
}

function splitSearchTextNode(
  value: string,
  expression: RegExp,
  nextMatchIndex: () => number,
): SearchTreeNode[] {
  expression.lastIndex = 0
  const nodes: SearchTreeNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = expression.exec(value))) {
    if (match.index > cursor) {
      nodes.push({ type: 'text', value: value.slice(cursor, match.index) })
    }
    nodes.push({
      type: 'element',
      tagName: 'mark',
      properties: {
        className: ['search-match'],
        dataMdviewSearchMatch: String(nextMatchIndex()),
      },
      children: [{ type: 'text', value: match[0] }],
    })
    cursor = match.index + match[0].length
  }

  if (nodes.length === 0) {
    return [{ type: 'text', value }]
  }
  if (cursor < value.length) {
    nodes.push({ type: 'text', value: value.slice(cursor) })
  }

  return nodes
}

function shouldSkipSearchHighlight(node: SearchTreeNode): boolean {
  if (node.tagName === 'script' || node.tagName === 'style') {
    return true
  }

  if (node.tagName !== 'pre') {
    return false
  }

  return Boolean(node.children?.some((child) => {
    const className = child.properties?.className
    return Array.isArray(className) && className.includes('language-mermaid')
  }))
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function assignRef(ref: Ref<HTMLElement> | undefined, element: HTMLElement | null) {
  if (typeof ref === 'function') {
    ref(element)
  } else if (ref) {
    ref.current = element
  }
}

function transformMarkdownUrl(url: string, key: string): string {
  if (/^file:\/\//i.test(url)) {
    return url
  }

  if (key === 'src' && /^data:image\/(?:avif|bmp|gif|jpe?g|png|svg\+xml|webp);/i.test(url)) {
    return url
  }

  return defaultUrlTransform(url)
}
const defaultPreviewLabels: MarkdownPreviewLabels = {
  copyCode: 'Copy',
  copiedCode: 'Copied',
  plainCodeBlock: 'Code block',
  codeBlock: (language) => `${language} code block`,
  mermaidDiagram: 'Mermaid diagram',
  mermaidLoading: 'Rendering Mermaid diagram...',
  mermaidError: 'Mermaid render failed',
  imagePreview: 'Image preview',
  closeImagePreview: 'Close image preview',
  imagePreviewAlt: (alt) => `${alt} preview`,
}

function CodeBlock({
  children,
  code,
  language,
  labels,
  ...props
}: ComponentProps<'pre'> & {
  code: string
  language: string | null
  labels: MarkdownPreviewLabels
}) {
  const [copied, setCopied] = useState(false)
  const copiedTimeoutRef = useRef<number | null>(null)
  const visibleLanguage = language ? normalizeLanguageLabel(language) : null

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current)
      }
    }
  }, [])

  async function handleCopy() {
    await copyTextToClipboard(code.replace(/\n$/, ''))
    setCopied(true)

    if (copiedTimeoutRef.current) {
      window.clearTimeout(copiedTimeoutRef.current)
    }

    copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <figure className="code-block">
      <figcaption className="code-block-header">
        <span>{visibleLanguage ?? labels.plainCodeBlock}</span>
        <button type="button" onClick={handleCopy}>
          {copied ? labels.copiedCode : labels.copyCode}
        </button>
      </figcaption>
      <pre
        aria-label={visibleLanguage ? labels.codeBlock(visibleLanguage) : labels.plainCodeBlock}
        {...props}
      >
        {children}
      </pre>
    </figure>
  )
}

function MarkdownTable({ children, ...props }: ComponentProps<'table'>) {
  return (
    <div className="table-scroll" role="region" tabIndex={0}>
      <table {...props}>{children}</table>
    </div>
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

  try {
    document.execCommand('copy')
  } finally {
    textarea.remove()
  }
}

function normalizeLanguageLabel(language: string) {
  const languageAliases: Record<string, string> = {
    js: 'JavaScript',
    jsx: 'JSX',
    ts: 'TypeScript',
    tsx: 'TSX',
    py: 'Python',
    sh: 'Shell',
    bash: 'Bash',
    zsh: 'Zsh',
    ps1: 'PowerShell',
    md: 'Markdown',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    rs: 'Rust',
  }

  return languageAliases[language.toLowerCase()] ?? language.toUpperCase()
}

function MermaidDiagram({ chart, labels }: { chart: string; labels: MarkdownPreviewLabels }) {
  const diagramId = useId().replace(/:/g, '')
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false

    async function renderDiagram() {
      try {
        setError(null)
        const result = await renderMermaidDiagram(`mdview-mermaid-${diagramId}`, chart)

        if (!canceled) {
          setSvg(sanitizeMermaidSvg(result.svg))
        }
      } catch (renderError) {
        if (!canceled) {
          setSvg(null)
          setError(renderError instanceof Error ? renderError.message : labels.mermaidError)
        }
      }
    }

    renderDiagram()

    return () => {
      canceled = true
    }
  }, [chart, diagramId, labels.mermaidError])

  if (error) {
    return (
      <div className="mermaid-error" role="alert">
        <strong>{labels.mermaidError}</strong>
        <span>{error}</span>
        <pre>
          <code>{chart}</code>
        </pre>
      </div>
    )
  }

  if (!svg) {
    return <div className="mermaid-loading">{labels.mermaidLoading}</div>
  }

  return (
    <div
      className="mermaid-diagram"
      role="img"
      aria-label={labels.mermaidDiagram}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

function getCodeBlockMetadata(children: ReactNode): { language: string | null; code: string } {
  if (!isReactElementWithProps(children)) {
    return { language: null, code: getReactNodeText(children) }
  }

  const className = children.props.className
  return {
    language: typeof className === 'string' ? getLanguageFromClassName(className) : null,
    code: getReactNodeText(children.props.children),
  }
}

function getLanguageFromClassName(className: string): string | null {
  return className
    .split(/\s+/)
    .find((classPart) => classPart.startsWith('language-'))
    ?.replace(/^language-/, '') ?? null
}

function getMermaidChart(children: ReactNode): string | null {
  if (!isReactElementWithProps(children)) {
    return null
  }

  const className = children.props.className
  if (typeof className !== 'string' || !/\blanguage-mermaid\b/.test(className)) {
    return null
  }

  const chart = getReactNodeText(children.props.children).trim()
  return chart.length > 0 ? chart : null
}

function isReactElementWithProps(value: ReactNode): value is ReactElement<{
  className?: unknown
  children?: ReactNode
}> {
  return typeof value === 'object' && value !== null && 'props' in value
}

function renderColorPreviews(children: ReactNode): ReactNode {
  if (typeof children === 'string') {
    return renderTextWithColorPreviews(children)
  }

  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <Fragment key={index}>{renderColorPreviews(child)}</Fragment>
    ))
  }

  return children
}

function renderTextWithColorPreviews(text: string): ReactNode {
  const colorPattern = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = colorPattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    parts.push(<ColorValuePreview key={`${match[0]}-${match.index}`} value={match[0]} />)
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

function ColorValuePreview({ value }: { value: string }) {
  return (
    <span className="color-preview-value">
      {value}
      <span
        className="color-preview-swatch"
        style={{ backgroundColor: value }}
        aria-label={`Color preview ${value}`}
      />
    </span>
  )
}

function isHexColorValue(value: string) {
  return /^#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value)
}

function getReactNodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(getReactNodeText).join('')
  }

  if (isReactElementWithProps(node)) {
    return getReactNodeText(node.props.children)
  }

  return ''
}

type LocalMarkdownImageProps = Omit<ComponentProps<'img'>, 'src' | 'alt'> & {
  src?: string
  alt?: string
  sourcePath?: string | null
  readLocalImageFile?: FileAccess['readLocalImageFile']
  labels: MarkdownPreviewLabels
}

function LocalMarkdownImage({
  src,
  alt,
  sourcePath,
  readLocalImageFile,
  labels,
  ...props
}: LocalMarkdownImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const resource = resolveLocalMarkdownResource(src, sourcePath)

  useEffect(() => {
    let canceled = false

    async function loadImage() {
      if (resource?.kind !== 'image' || !readLocalImageFile) {
        setResolvedSrc(src)
        return
      }

      try {
        const image = await readLocalImageFile(resource.path)
        if (!canceled) {
          setResolvedSrc(image.dataUrl)
        }
      } catch {
        if (!canceled) {
          setResolvedSrc(src)
        }
      }
    }

    loadImage()

    return () => {
      canceled = true
    }
  }, [readLocalImageFile, resource?.kind, resource?.path, src])

  useEffect(() => {
    if (!previewSrc) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPreviewSrc(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewSrc])

  return (
    <>
      <span className="markdown-image">
        <img
          src={resolvedSrc}
          alt={alt}
          onClick={() => {
            if (resolvedSrc) {
              setPreviewSrc(resolvedSrc)
            }
          }}
          {...props}
        />
        {alt ? <span className="markdown-image-caption">{alt}</span> : null}
      </span>
      {previewSrc
        ? createPortal(
            <div
              className="image-preview-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label={labels.imagePreview}
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) {
                  setPreviewSrc(null)
                }
              }}
            >
              <button
                type="button"
                className="image-preview-close"
                onClick={() => setPreviewSrc(null)}
                aria-label={labels.closeImagePreview}
              >
                ×
              </button>
              <img
                className="image-preview-image"
                src={previewSrc}
                alt={labels.imagePreviewAlt(alt ?? 'Image')}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
