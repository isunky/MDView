import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import mermaid from 'mermaid'
import {
  MarkdownPreview,
  type MarkdownPreviewLabels,
} from './MarkdownPreview'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (_id: string, chart: string) => ({
      svg: `<svg data-chart="${chart}" />`,
    })),
  },
}))

describe('MarkdownPreview', () => {
  it('does not parse the document again when its props are unchanged', () => {
    const codeBlockLabel = vi.fn((language: string) => `${language} code block`)
    const labels: MarkdownPreviewLabels = {
      copyCode: 'Copy',
      copiedCode: 'Copied',
      plainCodeBlock: 'Code block',
      codeBlock: codeBlockLabel,
      mermaidDiagram: 'Mermaid diagram',
      mermaidLoading: 'Rendering Mermaid diagram...',
      mermaidError: 'Mermaid render failed',
      imagePreview: 'Image preview',
      closeImagePreview: 'Close image preview',
      imagePreviewAlt: (alt) => `${alt} preview`,
    }
    const props = {
      content: ['```ts', 'const ready = true', '```'].join('\n'),
      labels,
    }
    const { rerender } = render(<MarkdownPreview {...props} />)
    const initialCalls = codeBlockLabel.mock.calls.length

    rerender(<MarkdownPreview {...props} />)

    expect(initialCalls).toBeGreaterThan(0)
    expect(codeBlockLabel).toHaveBeenCalledTimes(initialCalls)
  })

  it('renders common GFM markdown for reading', () => {
    render(
      <MarkdownPreview
        content={[
          '# Project',
          '',
          '- [x] Done',
          '',
          '| Key | Value |',
          '| --- | --- |',
          '| OS | Windows |',
          '',
          '```ts',
          'const ready = true',
          '```',
        ].join('\n')}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Project' })).toHaveAttribute('id', 'project')
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('table').parentElement).toHaveClass('table-scroll')
    expect(screen.getByText('Windows')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.tagName === 'CODE')).toHaveTextContent(
      'const ready = true',
    )
  })

  it('keeps supported raw HTML while removing active content and event handlers', () => {
    const { container } = render(
      <MarkdownPreview
        content={[
          '<details open><summary>More</summary><p align="center">Safe content</p></details>',
          '<img src="https://example.com/image.png" alt="Safe image" width="120" onerror="alert(1)" />',
          '<a href="javascript:alert(1)" onclick="alert(1)">Unsafe link</a>',
          '<iframe src="https://example.com"></iframe>',
          '<script>window.__unsafe = true</script>',
          '<style>body { display: none }</style>',
        ].join('\n')}
      />,
    )

    expect(screen.getByText('More').closest('details')).toHaveAttribute('open')
    expect(screen.getByText('Safe content')).toHaveAttribute('align', 'center')
    expect(screen.getByRole('img', { name: 'Safe image' })).toHaveAttribute('width', '120')
    expect(screen.getByRole('img', { name: 'Safe image' })).not.toHaveAttribute('onerror')
    expect(screen.getByText('Unsafe link').closest('a')).not.toHaveAttribute('href')
    expect(container.querySelector('script, style, iframe')).not.toBeInTheDocument()
  })

  it('allows safe web and local Markdown URLs but drops dangerous protocols', () => {
    render(
      <MarkdownPreview
        sourcePath="C:\\Docs\\readme.md"
        content={[
          '[Website](https://www.sunky.net)',
          '[Local](file:///C:/Docs/guide.md)',
          '<a href="data:text/html;base64,PHNjcmlwdD4=">Data URL</a>',
        ].join('\n\n')}
      />,
    )

    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://www.sunky.net',
    )
    expect(screen.getByRole('link', { name: 'Local' })).toHaveAttribute(
      'href',
      'file:///C:/Docs/guide.md',
    )
    expect(screen.getByText('Data URL').closest('a')).not.toHaveAttribute('href')
  })

  it('copies fenced code blocks from the preview', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<MarkdownPreview content={['```ts', 'const ready = true', '```'].join('\n')} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('const ready = true')
    })
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('adds stable ids to rendered headings', () => {
    render(
      <StrictMode>
        <MarkdownPreview content={['# Project Plan', '## Scope', '## Scope'].join('\n')} />
      </StrictMode>,
    )

    expect(screen.getByRole('heading', { name: 'Project Plan' })).toHaveAttribute(
      'id',
      'project-plan',
    )
    expect(screen.getAllByRole('heading', { name: 'Scope' })[0]).toHaveAttribute('id', 'scope')
    expect(screen.getAllByRole('heading', { name: 'Scope' })[1]).toHaveAttribute('id', 'scope-2')
  })

  it('loads local images relative to the current markdown file and previews them', async () => {
    const readLocalImageFile = vi.fn(async (path: string) => ({
      path,
      dataUrl: 'data:image/png;base64,abc',
    }))

    render(
      <MarkdownPreview
        content="![Diagram](images/diagram.png)"
        sourcePath="C:\\Docs\\readme.md"
        readLocalImageFile={readLocalImageFile}
      />,
    )

    await waitFor(() => {
      expect(readLocalImageFile).toHaveBeenCalledWith('C:\\Docs\\images\\diagram.png')
    })

    const image = screen.getByRole('img', { name: 'Diagram' })
    expect(image).toHaveAttribute('src', 'data:image/png;base64,abc')
    expect(screen.getByText('Diagram')).toHaveClass('markdown-image-caption')

    fireEvent.click(image)

    const dialog = screen.getByRole('dialog', { name: 'Image preview' })
    expect(dialog).toBeInTheDocument()
    expect(dialog.parentElement).toBe(document.body)
    expect(image.closest('p')).not.toContainElement(dialog)
    expect(screen.getByRole('img', { name: 'Diagram preview' })).toHaveAttribute(
      'src',
      'data:image/png;base64,abc',
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Image preview' })).not.toBeInTheDocument()
  })

  it('renders inline HTML and loads local images inside HTML blocks', async () => {
    const readLocalImageFile = vi.fn(async (path: string) => ({
      path,
      dataUrl: 'data:image/png;base64,logo',
    }))

    render(
      <MarkdownPreview
        content='<p align="center"><strong>HTML header</strong><br /><img src="images/logo.png" alt="Logo" width="112" /></p>'
        sourcePath="C:\\Docs\\README.md"
        readLocalImageFile={readLocalImageFile}
      />,
    )

    expect(screen.queryByText(/<p align=/)).not.toBeInTheDocument()
    expect(screen.getByText('HTML header')).toBeInTheDocument()

    await waitFor(() => {
      expect(readLocalImageFile).toHaveBeenCalledWith('C:\\Docs\\images\\logo.png')
    })

    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute(
      'src',
      'data:image/png;base64,logo',
    )
  })

  it('opens local markdown links through the app and scrolls same-document anchors', () => {
    const onOpenMarkdownLink = vi.fn()
    const scrollIntoView = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView

    render(
      <MarkdownPreview
        content={['# Current', '[Guide](guide.md#intro)', '[Current](#current)'].join('\n\n')}
        sourcePath="C:\\Docs\\readme.md"
        onOpenMarkdownLink={onOpenMarkdownLink}
      />,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Guide' }))

    expect(onOpenMarkdownLink).toHaveBeenCalledWith('C:\\Docs\\guide.md', 'intro')

    fireEvent.click(screen.getByRole('link', { name: 'Current' }))

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('opens web links with the system browser handler', () => {
    const onOpenExternalLink = vi.fn()

    render(
      <MarkdownPreview
        content="[MDView](https://www.sunky.net/MDView?from=readme)"
        onOpenExternalLink={onOpenExternalLink}
      />,
    )

    const link = screen.getByRole('link', { name: 'MDView' })
    fireEvent.click(link)

    expect(onOpenExternalLink).toHaveBeenCalledWith('https://www.sunky.net/MDView?from=readme')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('shows color swatches for hex colors in preview text and table cells', () => {
    render(
      <MarkdownPreview
        content={[
          'Accent color #13B8C8 is used for charts.',
          '',
          '| System | Color |',
          '| --- | --- |',
          '| Portal | `#1769FF` |',
        ].join('\n')}
      />,
    )

    expect(screen.getByLabelText('Color preview #13B8C8')).toHaveStyle({
      backgroundColor: '#13B8C8',
    })
    expect(screen.getByLabelText('Color preview #1769FF')).toHaveStyle({
      backgroundColor: '#1769FF',
    })
  })

  it('highlights visible preview search matches and reports their count', async () => {
    const onSearchMatchCountChange = vi.fn()
    render(
      <MarkdownPreview
        content="Read this. Read it again."
        searchQuery="read"
        activeSearchIndex={1}
        onSearchMatchCountChange={onSearchMatchCountChange}
      />,
    )

    const matches = await screen.findAllByText('Read')
    expect(matches).toHaveLength(2)
    expect(matches[1]).toHaveClass('search-match-active')
    expect(onSearchMatchCountChange).toHaveBeenLastCalledWith(2)
  })

  it('does not show color swatches inside fenced code blocks', () => {
    render(
      <MarkdownPreview
        content={['```css', '.button { color: #1769FF; }', '```'].join('\n')}
      />,
    )

    expect(screen.queryByLabelText('Color preview #1769FF')).not.toBeInTheDocument()
  })

  it('renders Mermaid fenced code blocks as diagrams', async () => {
    render(
      <MarkdownPreview
        content={['```mermaid', 'graph TD', '  A[Start] --> B[Done]', '```'].join('\n')}
      />,
    )

    expect(await screen.findByRole('img', { name: 'Mermaid diagram' })).toBeInTheDocument()
    expect(screen.queryByText(/graph TD/)).not.toBeInTheDocument()
  })

  it('shows Mermaid source when diagram rendering fails', async () => {
    vi.mocked(mermaid.render).mockRejectedValueOnce(new Error('Invalid Mermaid syntax'))

    render(<MarkdownPreview content={['```mermaid', 'graph TD', '  A -->', '```'].join('\n')} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Mermaid render failed')
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid Mermaid syntax')
    expect(screen.getByText(/graph TD/)).toBeInTheDocument()
  })
})
