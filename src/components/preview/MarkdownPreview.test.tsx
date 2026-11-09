import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import mermaid from 'mermaid'
import { savePreviewImage } from '../../platform/previewImageSave'
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
vi.mock('../../platform/previewImageSave', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../platform/previewImageSave')>(),
  savePreviewImage: vi.fn(),
}))

describe('MarkdownPreview', () => {
  it('renders Chinese bold punctuation followed immediately by prose', () => {
    const { container } = render(<MarkdownPreview content={'1. **数据库资源保障方式仍存在明显前后矛盾。**预算表已明确。\n2. **服务器来源口径。**当前正文。\n\n**第一处。**正文，**第二处！**后续。'} />)
    expect(Array.from(container.querySelectorAll('strong'), node => node.textContent)).toEqual([
      '数据库资源保障方式仍存在明显前后矛盾。', '服务器来源口径。', '第一处。', '第二处！',
    ])
    expect(container.textContent).not.toContain('**')
  })

  it('preserves literal bold markers in code and escaped text', () => {
    const { container } = render(<MarkdownPreview content={'`**示例。**正文`\n\n```md\n**示例。**正文\n```\n\n\\*\\*示例。\\*\\*正文\n\n** 空格。**正文\n\n**正常加粗**'} />)
    expect(container.querySelectorAll('strong')).toHaveLength(1)
    expect(container.querySelector('strong')).toHaveTextContent('正常加粗')
    expect(container.querySelector('code')).toHaveTextContent('**示例。**正文')
  })

  it('renders inline and display LaTeX formulas with KaTeX', async () => {
    render(<MarkdownPreview content={'Inline $E=mc^2$.\n\n$$\n\\frac{a}{b}\n$$'} />)

    await waitFor(() => expect(document.querySelectorAll('.katex').length).toBe(2), { timeout: 5000 })
    expect(document.querySelector('.katex-mathml math')).not.toBeNull()
    expect(document.querySelector('.katex-display')).toBeInTheDocument()
    expect(document.querySelector('.katex-display')?.closest('.code-block')).toBeNull()
  })

  it('does not allow trusted KaTeX URL commands', async () => {
    render(<MarkdownPreview content={'$\\href{javascript:alert(1)}{unsafe}$'} />)

    await waitFor(() => expect(document.querySelector('.katex')).toBeInTheDocument())
    expect(document.querySelector('.katex a')).not.toBeInTheDocument()
  })

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

  it('marks rendered blocks with internal source line positions', () => {
    render(<MarkdownPreview content={'# Title\n\nParagraph\n\n- Item'} />)

    expect(screen.getByRole('heading', { name: 'Title' })).toHaveAttribute('data-mdview-source-start', '1')
    expect(screen.getByText('Paragraph')).toHaveAttribute('data-mdview-source-start', '3')
    expect(screen.getByRole('list')).toHaveAttribute('data-mdview-source-start', '5')
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
        <MarkdownPreview content={['# Project Plan', '## Scope', '## Scope', '##### Appendix'].join('\n')} />
      </StrictMode>,
    )

    expect(screen.getByRole('heading', { name: 'Project Plan' })).toHaveAttribute(
      'id',
      'project-plan',
    )
    expect(screen.getAllByRole('heading', { name: 'Scope' })[0]).toHaveAttribute('id', 'scope')
    expect(screen.getAllByRole('heading', { name: 'Scope' })[1]).toHaveAttribute('id', 'scope-2')
    expect(screen.getByRole('heading', { name: 'Appendix' })).toHaveAttribute('id', 'appendix')
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

  it.each([
    '/D:/AICode/body/output/ui-audit/01-overview.png',
    'D:/AICode/body/output/ui-audit/01-overview.png',
    'file:///D:/AICode/body/output/ui-audit/01-overview.png',
  ])('loads Windows absolute image paths from Markdown: %s', async (href) => {
    const dataUrl = 'data:image/png;base64,overview'
    const readLocalImageFile = vi.fn(async (path: string) => ({ path, dataUrl }))

    render(<MarkdownPreview
      content={`![Overview](${href})`}
      sourcePath="D:\\AICode\\body\\output\\report.md"
      readLocalImageFile={readLocalImageFile}
    />)

    await waitFor(() => expect(screen.getByRole('img', { name: 'Overview' })).toHaveAttribute('src', dataUrl))
    expect(readLocalImageFile).toHaveBeenCalledWith('D:\\AICode\\body\\output\\ui-audit\\01-overview.png')
  })

  it('loads Windows drive paths inside HTML while removing unsafe image URLs', async () => {
    const dataUrl = 'data:image/png;base64,overview'
    const readLocalImageFile = vi.fn(async (path: string) => ({ path, dataUrl }))
    render(<MarkdownPreview
      content={'<img src="D:\\Docs\\overview.png" alt="Overview" />\n<img src="javascript:alert(1)" alt="Unsafe" />\n<img src="d:javascript:alert(1)" alt="Invalid drive" />'}
      sourcePath="D:\\Docs\\report.md"
      readLocalImageFile={readLocalImageFile}
    />)

    await waitFor(() => expect(screen.getByRole('img', { name: 'Overview' })).toHaveAttribute('src', dataUrl))
    expect(readLocalImageFile).toHaveBeenCalledWith('D:\\Docs\\overview.png')
    expect(readLocalImageFile).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('img', { name: 'Unsafe' })).not.toHaveAttribute('src')
    expect(screen.getByRole('img', { name: 'Invalid drive' })).not.toHaveAttribute('src')
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

  it.each(['/D:/Docs/guide.md#intro', 'D:/Docs/guide.md#intro'])('opens Windows Markdown paths: %s', (href) => {
    const onOpenMarkdownLink = vi.fn()
    render(<MarkdownPreview
      content={`[Guide](${href})`}
      sourcePath="D:\\Docs\\readme.md"
      onOpenMarkdownLink={onOpenMarkdownLink}
    />)

    fireEvent.click(screen.getByRole('link', { name: 'Guide' }))

    expect(onOpenMarkdownLink).toHaveBeenCalledWith('D:\\Docs\\guide.md', 'intro')
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

  it('does not rescan preview matches when moving between results', async () => {
    const onSearchMatchCountChange = vi.fn()
    const props = {
      content: 'Read this. Read it again.',
      searchQuery: 'read',
      activeSearchIndex: 0,
      onSearchMatchCountChange,
    }
    const { rerender } = render(<MarkdownPreview {...props} />)

    await screen.findAllByText('Read')
    expect(onSearchMatchCountChange).toHaveBeenCalledTimes(1)

    rerender(<MarkdownPreview {...props} activeSearchIndex={1} />)
    expect(screen.getAllByText('Read')[1]).toHaveClass('search-match-active')
    expect(onSearchMatchCountChange).toHaveBeenCalledTimes(1)
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

  it('opens Mermaid on double-click with an isolated, correctly sized SVG and restores focus on Escape', async () => {
    vi.mocked(mermaid.render).mockResolvedValueOnce({
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 1600 900"><text>Large chart</text><script>alert(1)</script></svg>',
    } as Awaited<ReturnType<typeof mermaid.render>>)
    render(<MarkdownPreview content={'```mermaid\ngraph TD\nA --> B\n```'} />)
    const diagram = await screen.findByRole('img', { name: 'Mermaid diagram' })
    diagram.focus()
    fireEvent.click(diagram)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.doubleClick(diagram)
    expect(screen.getByRole('dialog', { name: 'Mermaid diagram' }).parentElement).toBe(document.body)
    const image = document.querySelector<HTMLImageElement>('.image-preview-image')!
    const svg = decodeURIComponent(image.getAttribute('src')!.split(',')[1])
    expect(svg).toContain('width="1600"')
    expect(svg).toContain('height="900"')
    expect(svg).not.toContain('<script')
    expect(screen.getByRole('button', { name: 'Close diagram preview' })).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(diagram).toHaveFocus()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('zooms, drags and resets Mermaid using the shared preview controls', async () => {
    render(<MarkdownPreview content={'```mermaid\ngraph TD\nA --> B\n```'} />)
    fireEvent.doubleClick(await screen.findByRole('img', { name: 'Mermaid diagram' }))
    const image = document.querySelector<HTMLImageElement>('.image-preview-image')!
    image.setPointerCapture = vi.fn()
    image.hasPointerCapture = vi.fn(() => true)
    image.releasePointerCapture = vi.fn()
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(image.style.transform).toContain('scale(1.25)')
    fireEvent.pointerDown(image, { button: 0, pointerId: 1, clientX: 10, clientY: 20 })
    fireEvent.pointerMove(image, { pointerId: 1, clientX: 90, clientY: 60 })
    expect(image.style.transform).toContain('translate(80px, 40px)')
    fireEvent.pointerUp(image, { pointerId: 1 })
    expect(image.releasePointerCapture).toHaveBeenCalledWith(1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fit to window' }))
    expect(image.style.transform).toMatch(/^translate\(0px(?:, 0px)?\) scale\(1\)$/)
    fireEvent.wheel(image.parentElement!, { deltaY: -100, clientX: 0, clientY: 0 })
    expect(image.style.transform).not.toContain('scale(1)')
    for (let i = 0; i < 20; i++) fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled()
    expect(image.style.transform).toContain('scale(8)')
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(screen.getByRole('button', { name: 'Zoom in' })).not.toBeDisabled()
    fireEvent.click(image.parentElement!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens Mermaid with the keyboard and traps focus inside the dialog', async () => {
    render(<MarkdownPreview content={'```mermaid\ngraph TD\nA --> B\n```'} />)
    const diagram = await screen.findByRole('img', { name: 'Mermaid diagram' })
    fireEvent.keyDown(diagram, { key: 'Enter' })
    const close = screen.getByRole('button', { name: 'Close diagram preview' })
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Save image' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.click(close)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('navigates images and Mermaid in document order with buttons and arrow keys', async () => {
    render(<MarkdownPreview content={'![First](first.png)\n\n```mermaid\ngraph TD\nA --> B\n```\n\n![Last](last.png)'} />)
    await screen.findByRole('img', { name: 'Mermaid diagram' })
    fireEvent.click(screen.getByRole('img', { name: 'First' }))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous image or diagram' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next image or diagram' }))
    expect(screen.getByRole('dialog', { name: 'Mermaid diagram' })).toBeInTheDocument()
    expect(document.querySelector('.image-preview-image')).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml;'))
    expect(document.querySelector('.image-preview-image')).toHaveStyle({ transform: 'translate(0px, 0px) scale(1)' })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' })
    expect(screen.getByRole('img', { name: 'Last preview' })).toHaveAttribute('src', 'last.png')
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next image or diagram' })).toBeDisabled()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' })
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog', { name: 'Mermaid diagram' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close diagram preview' }))
    fireEvent.doubleClick(screen.getByRole('img', { name: 'Mermaid diagram' }))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous image or diagram' }))
    expect(screen.getByRole('img', { name: 'First preview' })).toBeInTheDocument()
  })

  it('keeps galleries scoped to one document and excludes failed Mermaid diagrams', async () => {
    vi.mocked(mermaid.render).mockRejectedValueOnce(new Error('Invalid diagram'))
    render(<><MarkdownPreview content={'![First](first.png)\n\n```mermaid\nbroken\n```\n\n<img src="last.png" alt="Last" />'} />
      <MarkdownPreview content={'![Other document](other.png)'} /></>)
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('img', { name: 'First' }))
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next image or diagram' }))
    expect(screen.getByRole('img', { name: 'Last preview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next image or diagram' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Close image preview' }))
    fireEvent.click(screen.getByRole('img', { name: 'Other document' }))
    expect(screen.queryByRole('button', { name: 'Next image or diagram' })).not.toBeInTheDocument()
  })

  it('reads a local image resolved after the gallery opened when navigating to it', async () => {
    let resolveImage!: (image: { dataUrl: string; path: string }) => void
    const readLocalImageFile = vi.fn(() => new Promise<{ dataUrl: string; path: string }>((resolve) => { resolveImage = resolve }))
    render(<MarkdownPreview content={'![First](https://example.com/first.png)\n\n![Local](local.png)'} sourcePath="C:\\Docs\\readme.md" readLocalImageFile={readLocalImageFile} />)
    await waitFor(() => expect(readLocalImageFile).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('img', { name: 'First' }))
    resolveImage({ dataUrl: 'data:image/png;base64,local', path: 'C:\\Docs\\local.png' })
    await waitFor(() => expect(screen.getByRole('img', { name: 'Local' })).toHaveAttribute('src', 'data:image/png;base64,local'))
    fireEvent.click(screen.getByRole('button', { name: 'Next image or diagram' }))
    expect(screen.getByRole('img', { name: 'Local preview' })).toHaveAttribute('src', 'data:image/png;base64,local')
  })

  it('closes the gallery when switching documents and rebuilds it on the next open', () => {
    const { rerender } = render(<MarkdownPreview content={'![First](first.png)\n\n![Last](last.png)'} sourcePath="first.md" />)
    fireEvent.click(screen.getByRole('img', { name: 'Last' }))
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    rerender(<MarkdownPreview content={'![New](new.png)'} sourcePath="new.md" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).not.toBe('hidden')
    fireEvent.click(screen.getByRole('img', { name: 'New' }))
    expect(screen.getByRole('img', { name: 'New preview' })).toHaveAttribute('src', 'new.png')
    expect(screen.queryByRole('button', { name: 'Previous image or diagram' })).not.toBeInTheDocument()
  })

  it('saves the currently displayed Mermaid after navigating and keeps it stable while saving', async () => {
    let finishSave!: (path: string | null) => void
    vi.mocked(savePreviewImage).mockReturnValueOnce(new Promise((resolve) => { finishSave = resolve }))
    render(<MarkdownPreview content={'![Photo](photo.jpg)\n\n```mermaid\ngraph TD\nA --> B\n```'} />)
    await screen.findByRole('img', { name: 'Mermaid diagram' })
    fireEvent.click(screen.getByRole('img', { name: 'Photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next image or diagram' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))
    expect(savePreviewImage).toHaveBeenLastCalledWith(expect.objectContaining({
      src: expect.stringContaining('data:image/svg+xml;'), fileName: 'mermaid-diagram.png', rasterizeSvg: true,
    }))
    expect(screen.getByRole('button', { name: 'Save image' })).toBeDisabled()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog', { name: 'Mermaid diagram' })).toBeInTheDocument()
    finishSave('diagram.png')
    await screen.findByText('Image saved')
    expect(screen.getByRole('button', { name: 'Save image' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Previous image or diagram' }))
    expect(screen.queryByText('Image saved')).not.toBeInTheDocument()
  })

  it('handles canceled and failed image saves and allows retrying', async () => {
    vi.mocked(savePreviewImage).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('disk unavailable')).mockResolvedValueOnce('photo.jpg')
    render(<MarkdownPreview content={'![Photo](photo.jpg)'} />)
    fireEvent.click(screen.getByRole('img', { name: 'Photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))
    await screen.findByText('Save canceled')
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save image')
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))
    await screen.findByText('Image saved')
    expect(savePreviewImage).toHaveBeenLastCalledWith(expect.objectContaining({ src: 'photo.jpg', fileName: 'photo.jpg', rasterizeSvg: false }))
  })
})
