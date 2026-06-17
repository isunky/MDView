import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MarkdownPreview } from './MarkdownPreview'

describe('MarkdownPreview', () => {
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

    expect(screen.getByRole('heading', { name: 'Project' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Windows')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.tagName === 'CODE')).toHaveTextContent(
      'const ready = true',
    )
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

    fireEvent.click(image)

    expect(screen.getByRole('dialog', { name: 'Image preview' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Diagram preview' })).toHaveAttribute(
      'src',
      'data:image/png;base64,abc',
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Image preview' })).not.toBeInTheDocument()
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
})
