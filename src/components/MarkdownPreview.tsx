import type { Content, Heading, PhrasingContent, Root } from 'mdast'
import {
  Fragment,
  useEffect,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/github.css'
import {
  resolveLocalMarkdownResource,
  resolveSameDocumentHeading,
} from '../domain/localMarkdownResources'
import { createHeadingIdCounts, createUniqueHeadingId } from '../domain/markdownOutline'
import {
  isExternalWebUrl,
  openExternalLink,
  type OpenExternalLink,
} from '../platform/externalLinks'
import type { FileAccess } from '../platform/fileAccess'

type MarkdownPreviewProps = {
  content: string
  previewRef?: Ref<HTMLElement>
  sourcePath?: string | null
  readLocalImageFile?: FileAccess['readLocalImageFile']
  onOpenMarkdownLink?: (path: string, headingId?: string) => void
  onOpenExternalLink?: OpenExternalLink
}

export function MarkdownPreview({
  content,
  previewRef,
  sourcePath,
  readLocalImageFile,
  onOpenMarkdownLink,
  onOpenExternalLink = openExternalLink,
}: MarkdownPreviewProps) {
  return (
    <article className="markdown-preview" aria-label="Markdown preview" ref={previewRef}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkHeadingIds]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          p({ children, ...props }) {
            return <p {...props}>{renderColorPreviews(children)}</p>
          },
          li({ children, ...props }) {
            return <li {...props}>{renderColorPreviews(children)}</li>
          },
          td({ children, ...props }) {
            return <td {...props}>{renderColorPreviews(children)}</td>
          },
          th({ children, ...props }) {
            return <th {...props}>{renderColorPreviews(children)}</th>
          },
          code({ children, className, ...props }) {
            const codeText = getReactNodeText(children)
            const isInlineColor = !className && isHexColorValue(codeText)

            return (
              <code className={className} {...props}>
                {isInlineColor ? <ColorValuePreview value={codeText} /> : children}
              </code>
            )
          },
          a({ href, children, ...props }) {
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
          img({ src, alt, ...props }) {
            return (
              <LocalMarkdownImage
                src={src}
                alt={alt}
                sourcePath={sourcePath}
                readLocalImageFile={readLocalImageFile}
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

  return ''
}

type LocalMarkdownImageProps = Omit<ComponentProps<'img'>, 'src' | 'alt'> & {
  src?: string
  alt?: string
  sourcePath?: string | null
  readLocalImageFile?: FileAccess['readLocalImageFile']
}

function LocalMarkdownImage({
  src,
  alt,
  sourcePath,
  readLocalImageFile,
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
      {previewSrc ? (
        <div
          className="image-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
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
            aria-label="Close image preview"
          >
            ×
          </button>
          <img className="image-preview-image" src={previewSrc} alt={`${alt ?? 'Image'} preview`} />
        </div>
      ) : null}
    </>
  )
}

function remarkHeadingIds() {
  return function transform(tree: Root) {
    const idCounts = createHeadingIdCounts()
    visitMarkdownNode(tree, (node) => {
      if (node.type !== 'heading' || node.depth > 3) {
        return
      }

      const data = ((node.data ??= {}) as Heading['data'] & {
        hProperties?: Record<string, string>
      })
      data.hProperties = {
        ...data.hProperties,
        id: createUniqueHeadingId(getMarkdownNodeText(node.children), idCounts),
      }
    })
  }
}

function visitMarkdownNode(node: Root | Content, visitor: (node: Content) => void) {
  if (node.type !== 'root') {
    visitor(node)
  }

  if ('children' in node) {
    node.children.forEach((child) => visitMarkdownNode(child, visitor))
  }
}

function getMarkdownNodeText(nodes: PhrasingContent[]): string {
  return nodes.map(getMarkdownChildText).join('')
}

function getMarkdownChildText(node: PhrasingContent): string {
  if ('value' in node && typeof node.value === 'string') {
    return node.value
  }

  if ('children' in node) {
    return getMarkdownNodeText(node.children)
  }

  return ''
}
