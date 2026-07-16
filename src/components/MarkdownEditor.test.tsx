import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  beforeEach(() => {
    setNavigatorPlatform('Win32')
  })

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

  it('uses the platform-specific modifier key for formatting shortcuts', () => {
    const onChange = vi.fn()
    const { unmount } = render(
      <MarkdownEditor value="hello" onChange={onChange} label="Markdown source" t={labels} />,
    )

    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(0, 5)
    fireEvent.keyDown(editor, { key: 'b', metaKey: true })

    expect(onChange).not.toHaveBeenCalled()

    unmount()
    setNavigatorPlatform('MacIntel')
    render(<MarkdownEditor value="hello" onChange={onChange} label="Markdown source" t={labels} />)

    const macEditor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    macEditor.setSelectionRange(0, 5)
    fireEvent.keyDown(macEditor, { key: 'b', metaKey: true })

    expect(onChange).toHaveBeenCalledWith('**hello**')

    onChange.mockClear()
    fireEvent.keyDown(macEditor, { key: 'b', ctrlKey: true })

    expect(onChange).not.toHaveBeenCalled()
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
    expect(screen.getByText(/```mermaid/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close markdown syntax reference' }))

    expect(
      screen.queryByRole('dialog', { name: 'Markdown syntax reference' }),
    ).not.toBeInTheDocument()
  })

  it('passes pasted image files and the current selection to the import handler', () => {
    const onImportImages = vi.fn()
    render(
      <MarkdownEditor
        value="hello"
        onChange={vi.fn()}
        onImportImages={onImportImages}
        label="Markdown source"
        t={labels}
      />,
    )

    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(1, 4)
    const image = new File(['image'], 'photo.png', { type: 'image/png' })
    fireEvent.paste(editor, { clipboardData: { files: [image] } })

    expect(onImportImages).toHaveBeenCalledWith([image], { start: 1, end: 4 })
  })
})

function setNavigatorPlatform(platform: string) {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}
