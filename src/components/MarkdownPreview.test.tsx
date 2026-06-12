import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
})
