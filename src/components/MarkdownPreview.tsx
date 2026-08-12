import { memo, useCallback, useEffect, useMemo, useRef, type MouseEvent, type Ref } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import './highlightThemes.css'
import { resolveLocalMarkdownResource, resolveSameDocumentHeading } from '../domain/localMarkdownResources'
import { markdownSanitizeSchema, rehypeSafeHeadingIds, rehypeSourcePositions } from '../domain/markdownSanitize'
import { createSearchHighlightPlugin } from '../domain/previewSearchHighlight'
import type { EffectiveReadingTheme } from '../domain/readingPreferences'
import { isExternalWebUrl, openExternalLink, type OpenExternalLink } from '../platform/externalLinks'
import type { FileAccess } from '../platform/fileAccess'
import { CodeBlock } from './preview/CodeBlock'
import { LocalMarkdownImage } from './preview/LocalMarkdownImage'
import { MermaidDiagram } from './preview/MermaidDiagram'
import {
  ColorValuePreview,
  getCodeBlockMetadata,
  getMermaidChart,
  getReactNodeText,
  isHexColorValue,
  MarkdownTable,
  renderColorPreviews,
} from './preview/previewRenderers'
import type { MarkdownPreviewLabels } from './preview/previewTypes'

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
  theme?: EffectiveReadingTheme
}

export type { MarkdownPreviewLabels } from './preview/previewTypes'

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
  theme = 'light',
}: MarkdownPreviewProps) {
  const articleRef = useRef<HTMLElement | null>(null)
  const searchHighlightPlugin = useMemo(() => createSearchHighlightPlugin(searchQuery), [searchQuery])
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
      if (isActive && matches.length > 0) match.scrollIntoView?.({ block: 'center', behavior: 'auto' })
    })
  }, [activeSearchIndex, content, onSearchMatchCountChange, searchQuery])

  return (
    <article className="markdown-preview" aria-label="Markdown preview" ref={setPreviewRef}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, markdownSanitizeSchema],
          rehypeSourcePositions,
          rehypeSafeHeadingIds,
          rehypeHighlight,
          searchHighlightPlugin,
        ]}
        urlTransform={transformMarkdownUrl}
        components={{
          pre({ children, node, ...props }) {
            const mermaidChart = getMermaidChart(children)
            if (mermaidChart) {
              return <MermaidDiagram chart={mermaidChart} labels={labels} sourceLine={node?.position?.start.line} theme={theme} />
            }
            const metadata = getCodeBlockMetadata(children)
            return <CodeBlock code={metadata.code} language={metadata.language} labels={labels} {...props}>{children}</CodeBlock>
          },
          table({ children, node, ...props }) {
            void node
            return <MarkdownTable {...props}>{children}</MarkdownTable>
          },
          p({ children, node, ...props }) { void node; return <p {...props}>{renderColorPreviews(children)}</p> },
          li({ children, node, ...props }) { void node; return <li {...props}>{renderColorPreviews(children)}</li> },
          td({ children, node, ...props }) { void node; return <td {...props}>{renderColorPreviews(children)}</td> },
          th({ children, node, ...props }) { void node; return <th {...props}>{renderColorPreviews(children)}</th> },
          code({ children, className, node, ...props }) {
            void node
            const codeText = getReactNodeText(children)
            return <code className={className} {...props}>{!className && isHexColorValue(codeText) ? <ColorValuePreview value={codeText} /> : children}</code>
          },
          a({ href, children, node, ...props }) {
            void node
            function handleClick(event: MouseEvent<HTMLAnchorElement>) {
              const heading = resolveSameDocumentHeading(href)
              if (heading) {
                event.preventDefault()
                window.document.getElementById(heading)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
                void Promise.resolve(onOpenExternalLink(href)).catch((error) => console.error('Failed to open external link', error))
              }
            }
            const external = isExternalWebUrl(href)
            return <a href={href} onClick={handleClick} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} {...props}>{children}</a>
          },
          img({ src, alt, node, ...props }) {
            void node
            return <LocalMarkdownImage src={src} alt={alt} sourcePath={sourcePath} readLocalImageFile={readLocalImageFile} labels={labels} {...props} />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
})

function assignRef(ref: Ref<HTMLElement> | undefined, element: HTMLElement | null) {
  if (typeof ref === 'function') ref(element)
  else if (ref) ref.current = element
}

function transformMarkdownUrl(url: string, key: string): string {
  if (/^file:\/\//i.test(url)) return url
  if (key === 'src' && /^data:image\/(?:avif|bmp|gif|jpe?g|png|svg\+xml|webp);/i.test(url)) return url
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
