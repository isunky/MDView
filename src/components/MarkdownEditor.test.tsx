import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MarkdownEditor } from './MarkdownEditor'

const labels = {
  toolbarLabel: 'Markdown formatting',
  boldLabel: 'Bold',
  italicLabel: 'Italic',
  codeLabel: 'Code',
  headingLabel: 'Heading',
  linkLabel: 'Link',
  imageLabel: 'Image',
  quoteLabel: 'Quote',
  unorderedListLabel: 'Bulleted list',
  orderedListLabel: 'Numbered list',
  taskListLabel: 'Task list',
  syntaxReferenceLabel: 'Markdown syntax reference',
  syntaxReferenceTitle: 'Markdown syntax reference',
  closeSyntaxReference: 'Close markdown syntax reference',
}

describe('MarkdownEditor', () => {
  it('formats selected text from the toolbar', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MarkdownEditor value="hello" onChange={onChange} label="Markdown source" t={labels} />)

    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(0, 5)

    await user.click(screen.getByRole('button', { name: 'Bold' }))

    expect(onChange).toHaveBeenCalledWith('**hello**')
  })

  it('supports common formatting keyboard shortcuts', () => {
    const onChange = vi.fn()
    render(<MarkdownEditor value="hello" onChange={onChange} label="Markdown source" t={labels} />)

    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(0, 5)

    fireEvent.keyDown(editor, { key: 'b', ctrlKey: true })

    expect(onChange).toHaveBeenCalledWith('**hello**')
  })

  it('indents and outdents selected lines with Tab', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <MarkdownEditor value={'one\ntwo'} onChange={onChange} label="Markdown source" t={labels} />,
    )

    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(0, 7)
    fireEvent.keyDown(editor, { key: 'Tab' })

    expect(onChange).toHaveBeenCalledWith('  one\n  two')

    rerender(
      <MarkdownEditor
        value={'  one\n  two'}
        onChange={onChange}
        label="Markdown source"
        t={labels}
      />,
    )
    editor.setSelectionRange(0, 11)
    fireEvent.keyDown(editor, { key: 'Tab', shiftKey: true })

    expect(onChange).toHaveBeenLastCalledWith('one\ntwo')
  })

  it('continues and exits markdown lists on Enter', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <MarkdownEditor value="- item" onChange={onChange} label="Markdown source" t={labels} />,
    )

    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(6, 6)
    fireEvent.keyDown(editor, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith('- item\n- ')

    rerender(<MarkdownEditor value="- " onChange={onChange} label="Markdown source" t={labels} />)
    editor.setSelectionRange(2, 2)
    fireEvent.keyDown(editor, { key: 'Enter' })

    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('opens and closes the markdown syntax reference', async () => {
    const user = userEvent.setup()
    render(<MarkdownEditor value="" onChange={vi.fn()} label="Markdown source" t={labels} />)

    await user.click(screen.getByRole('button', { name: 'Markdown syntax reference' }))

    expect(screen.getByRole('dialog', { name: 'Markdown syntax reference' })).toBeInTheDocument()
    expect(screen.getByText('# Heading 1')).toBeInTheDocument()
    expect(screen.getByText('![Alt](image.png)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close markdown syntax reference' }))

    expect(
      screen.queryByRole('dialog', { name: 'Markdown syntax reference' }),
    ).not.toBeInTheDocument()
  })
})
