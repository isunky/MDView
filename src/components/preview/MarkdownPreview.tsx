import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type MouseEvent, type Ref } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { remarkCjkStrong } from '../../domain/remarkCjkStrong'
import './highlightThemes.css'
import { resolveLocalMarkdownResource, resolveSameDocumentHeading } from '../../domain/localMarkdownResources'
import { markdownSanitizeSchema, rehypeSafeHeadingIds, rehypeSourcePositions, rehypeWindowsFileUrls } from '../../domain/markdownSanitize'
import { createSearchHighlightPlugin } from '../../domain/previewSearchHighlight'
import { findPreviewSearchRanges, supportsSearchHighlights } from '../../domain/previewSearchRanges'
import type { EffectiveReadingTheme } from '../../domain/readingPreferences'
import { isExternalWebUrl, openExternalLink, type OpenExternalLink } from '../../platform/externalLinks'
import type { FileAccess } from '../../platform/fileAccess'
import { CodeBlock } from './CodeBlock'
import { LocalMarkdownImage } from './LocalMarkdownImage'
import { MermaidDiagram } from './MermaidDiagram'
import { MediaPreviewDialog } from './MediaPreviewDialog'
import { readPreviewMedia, type PreviewMedia } from './previewMedia'
import {
  ColorValuePreview,
  getCodeBlockMetadata,
  getMermaidChart,
  getReactNodeText,
  isHexColorValue,
  MarkdownTable,
  renderColorPreviews,
} from './previewRenderers'
import type { MarkdownPreviewLabels } from './previewTypes'
import { containsMarkdownMath } from '../../domain/markdownMath'
import type { PluggableList } from 'unified'

type MathPlugins = {
  remarkMath: typeof import('remark-math').default
  rehypeKatex: typeof import('rehype-katex').default
}

type MarkdownRendererComponents = NonNullable<ComponentProps<typeof ReactMarkdown>['components']>

type MarkdownBodyProps = {
  components: MarkdownRendererComponents
  content: string
  rehypePlugins: PluggableList
  remarkPlugins: PluggableList
}

let mathPluginsPromise: Promise<MathPlugins> | null = null

const MarkdownBody = memo(function MarkdownBody({
  components,
  content,
  rehypePlugins,
  remarkPlugins,
}: MarkdownBodyProps) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      urlTransform={transformMarkdownUrl}
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
})

function loadMathPlugins() {
  if (!mathPluginsPromise) {
    mathPluginsPromise = Promise.all([
      import('remark-math'),
      import('rehype-katex'),
    ]).then(([remarkModule, rehypeModule]) => {
      void import('katex/dist/katex.min.css').catch(() => undefined)
      return { remarkMath: remarkModule.default, rehypeKatex: rehypeModule.default }
    })
  }
  return mathPluginsPromise
}

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

export type { MarkdownPreviewLabels } from './previewTypes'

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
  const searchMatchesRef = useRef<HTMLElement[]>([])
  const activeSearchMatchRef = useRef<HTMLElement | null>(null)
  const searchRangesRef = useRef<Range[]>([])
  const nativeSearchHighlights = supportsSearchHighlights()
  const [mathPlugins, setMathPlugins] = useState<MathPlugins | null>(null)
  const context = useMemo(() => ({ content, sourcePath }), [content, sourcePath])
  const contextRef = useRef(context)
  useLayoutEffect(() => { contextRef.current = context }, [context])
  const [gallery, setGallery] = useState<{ elements: HTMLElement[]; index: number; media: PreviewMedia; context: typeof context } | null>(null)
  const openMediaPreview = useCallback((element: HTMLElement) => {
    const article = articleRef.current
    if (!article) return
    const elements = Array.from(article.querySelectorAll<HTMLElement>('.markdown-image > img[src], .mermaid-diagram'))
      .filter((item) => item.tagName === 'IMG' ? Boolean(item.getAttribute('src')) : Boolean(item.querySelector('svg')))
    const index = elements.indexOf(element)
    const media = readPreviewMedia(element, labels)
    if (index >= 0 && media) setGallery({ elements, index, media, context: contextRef.current })
  }, [labels])
  function navigateMedia(direction: -1 | 1) {
    setGallery((current) => {
      if (!current) return null
      const index = current.index + direction
      if (index < 0 || index >= current.elements.length) return current
      const media = readPreviewMedia(current.elements[index], labels)
      return media ? { ...current, index, media } : current
    })
  }
  const hasMath = useMemo(() => containsMarkdownMath(content), [content])
  const fallbackSearchQuery = nativeSearchHighlights ? '' : searchQuery
  const searchHighlightPlugin = useMemo(() => createSearchHighlightPlugin(fallbackSearchQuery), [fallbackSearchQuery])
  const setPreviewRef = useCallback((element: HTMLElement | null) => {
    articleRef.current = element
    assignRef(previewRef, element)
  }, [previewRef])

  useEffect(() => {
    if (!hasMath || mathPlugins) return
    let active = true
    void loadMathPlugins().then((plugins) => {
      if (active) setMathPlugins(plugins)
    }).catch(() => undefined)
    return () => { active = false }
  }, [hasMath, mathPlugins])

  const remarkPlugins = useMemo<PluggableList>(() => mathPlugins ? [remarkGfm, mathPlugins.remarkMath, remarkCjkStrong] : [remarkGfm, remarkCjkStrong], [mathPlugins])
  const rehypePlugins = useMemo<PluggableList>(() => {
    const plugins: PluggableList = [
      rehypeRaw,
      rehypeWindowsFileUrls,
      [rehypeSanitize, markdownSanitizeSchema],
      rehypeSourcePositions,
      rehypeSafeHeadingIds,
    ]
    if (mathPlugins) plugins.push([mathPlugins.rehypeKatex, { throwOnError: false, trust: false, output: 'htmlAndMathml' }])
    plugins.push(rehypeHighlight, searchHighlightPlugin)
    return plugins
  }, [mathPlugins, searchHighlightPlugin])

  const components = useMemo<MarkdownRendererComponents>(() => ({
    pre({ children, node, ...props }) {
      const mermaidChart = getMermaidChart(children)
      if (mermaidChart) {
        return <MermaidDiagram chart={mermaidChart} labels={labels} sourceLine={node?.position?.start.line} theme={theme} onPreview={openMediaPreview} />
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
      return <LocalMarkdownImage src={src} alt={alt} sourcePath={sourcePath} readLocalImageFile={readLocalImageFile} onPreview={openMediaPreview} {...props} />
    },
  }), [labels, onOpenExternalLink, onOpenMarkdownLink, openMediaPreview, readLocalImageFile, sourcePath, theme])

  useEffect(() => {
    const article = articleRef.current
    if (nativeSearchHighlights) {
      const ranges = article ? findPreviewSearchRanges(article, searchQuery) : []
      searchRangesRef.current = ranges
      const highlight = new Highlight()
      for (const range of ranges) highlight.add(range)
      CSS.highlights.set('mdview-search', highlight)
      onSearchMatchCountChange?.(ranges.length)
      return () => {
        if (CSS.highlights.get('mdview-search') === highlight) CSS.highlights.delete('mdview-search')
      }
    }
    if (!article) {
      onSearchMatchCountChange?.(0)
      return
    }
    if (!searchQuery) {
      searchMatchesRef.current = []
      onSearchMatchCountChange?.(0)
      return
    }
    const matches = Array.from(article.querySelectorAll<HTMLElement>('[data-mdview-search-match]'))
    searchMatchesRef.current = matches
    onSearchMatchCountChange?.(matches.length)
  }, [components, content, nativeSearchHighlights, onSearchMatchCountChange, rehypePlugins, remarkPlugins, searchQuery])

  useEffect(() => {
    if (nativeSearchHighlights) {
      const current = searchRangesRef.current[activeSearchIndex]
      const highlight = new Highlight()
      highlight.priority = 1
      if (current) {
        highlight.add(current)
        current.startContainer.parentElement?.scrollIntoView?.({ block: 'center', behavior: 'auto' })
      }
      CSS.highlights.set('mdview-search-active', highlight)
      return () => {
        if (CSS.highlights.get('mdview-search-active') === highlight) CSS.highlights.delete('mdview-search-active')
      }
    }
    activeSearchMatchRef.current?.classList.remove('search-match-active')
    const current = searchMatchesRef.current[activeSearchIndex]
    activeSearchMatchRef.current = current ?? null
    if (!current) return
    current.classList.add('search-match-active')
    current.scrollIntoView?.({ block: 'center', behavior: 'auto' })
  }, [activeSearchIndex, components, content, nativeSearchHighlights, rehypePlugins, remarkPlugins, searchQuery])

  return (
    <><article className="markdown-preview" aria-label="Markdown preview" ref={setPreviewRef}>
      <MarkdownBody
        components={components}
        content={content}
        rehypePlugins={rehypePlugins}
        remarkPlugins={remarkPlugins}
      />
    </article>
      {gallery?.context === context ? <MediaPreviewDialog {...gallery.media} labels={labels} onClose={() => setGallery(null)}
        navigation={{ index: gallery.index, total: gallery.elements.length, onNavigate: navigateMedia }} /> : null}
    </>
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
  openMermaidPreview: 'Double-click to preview diagram',
  closeMermaidPreview: 'Close diagram preview',
  previewZoomIn: 'Zoom in',
  previewZoomOut: 'Zoom out',
  previewReset: 'Fit to window',
  previewInteractionHint: 'Scroll to zoom · Drag to move · Esc to close',
  previewPrevious: 'Previous image or diagram',
  previewNext: 'Next image or diagram',
  previewPosition: (current: number, total: number) => `${current} / ${total}`,
  previewSave: 'Save image',
  previewSaving: 'Saving image…',
  previewSaved: 'Image saved',
  previewSaveCanceled: 'Save canceled',
  previewSaveFailed: 'Unable to save image. Please try again.',
  previewReadFailed: 'Unable to read the image. Reopen the preview and try again.',
  previewRenderFailed: 'Unable to convert the diagram to PNG. Please try again.',
  previewWriteFailed: 'Unable to save the file. Check the save location and permissions.',
  imagePreview: 'Image preview',
  closeImagePreview: 'Close image preview',
  imagePreviewAlt: (alt) => `${alt} preview`,
}
