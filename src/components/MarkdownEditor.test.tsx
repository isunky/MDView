import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { markdownSyntaxReference } from '../domain/markdownSyntaxReference'
import { translations } from '../i18n'
import { MarkdownEditor } from './MarkdownEditor'

const labels = {
  toolbarLabel: 'Markdown formatting',
  undoLabel: 'Undo',
  redoLabel: 'Redo',
  boldLabel: 'Bold',
  italicLabel: 'Italic',
  codeLabel: 'Code',
  headingLabel: 'Heading',
  headingLevelLabel: (level: number) => `Heading ${level}`,
  linkLabel: 'Link',
  imageLabel: 'Image',
  tableLabel: 'Insert table',
  tablePickerLabel: 'Choose table size',
  tableSizeLabel: (columns: number, rows: number) => `${columns} columns by ${rows} rows`,
  tableHeaderPlaceholder: (column: number) => `Header ${column}`,
  tableCellPlaceholder: 'Cell',
  quoteLabel: 'Quote',
  blockMenuLabel: 'Block formatting',
  codeBlockLabel: 'Code block',
  horizontalRuleLabel: 'Horizontal rule',
  unorderedListLabel: 'Bulleted list',
  orderedListLabel: 'Numbered list',
  taskListLabel: 'Task list',
  mathLabel: 'Insert formula',
  mathDialogTitle: 'Math formula',
  mathInlineMode: 'Inline',
  mathBlockMode: 'Display block',
  mathLatexLabel: 'LaTeX expression',
  mathPreviewLabel: 'Preview',
  mathTemplatesLabel: 'Common templates',
  mathInsert: 'Insert formula',
  mathUpdate: 'Update formula',
  mathCancel: 'Cancel',
  mathInvalid: 'Invalid formula',
  syntaxReferenceLabel: 'Markdown syntax reference',
  syntaxReferenceTitle: 'Markdown syntax reference',
  syntaxReferenceIntro: 'Supported syntax examples.',
  syntaxReferenceCategories: 'Syntax categories',
  syntaxReferenceSafetyNote: 'Unsafe HTML is removed.',
  syntaxReferenceSections: markdownSyntaxReference.en,
  copySyntax: (name: string) => `Copy ${name} syntax`,
  copiedSyntax: (name: string) => `${name} syntax copied`,
  copySyntaxFailed: 'Unable to copy the syntax example.',
  closeSyntaxReference: 'Close markdown syntax reference',
}

describe('MarkdownEditor', () => {
  beforeEach(() => {
    setNavigatorPlatform('Win32')
  })

  it('inserts and reopens a formula from the toolbar', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<MarkdownEditor value="" onChange={onChange} label="Markdown source" t={labels} />)

    await user.click(screen.getAllByRole('button', { name: 'Insert formula' }).at(-1)!)
    const input = await screen.findByRole('textbox', { name: 'LaTeX expression' })
    await user.type(input, 'x^2')
    await user.click(screen.getAllByRole('button', { name: 'Insert formula' }).at(-1)!)
    expect(onChange).toHaveBeenLastCalledWith('$x^2$')

    rerender(<MarkdownEditor value="$x^2$" onChange={onChange} label="Markdown source" t={labels} />)
    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(2, 2)
    await user.click(screen.getByRole('toolbar').querySelector<HTMLButtonElement>('[aria-label="Insert formula"]')!)
    expect(await screen.findByRole('textbox', { name: 'LaTeX expression' })).toHaveValue('x^2')
    expect(screen.getByRole('button', { name: 'Update formula' })).toBeInTheDocument()
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

  it('inserts a selected table size without discarding selected text', async () => {
    const user = userEvent.setup()
    render(<ControlledEditor initialValue="keep" />)

    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(0, 4)
    await user.click(screen.getByRole('button', { name: 'Insert table' }))
    await user.click(screen.getByRole('gridcell', { name: '3 columns by 3 rows' }))

    expect(editor.value).toBe([
      'keep',
      '',
      '| Header 1 | Header 2 | Header 3 |',
      '| --- | --- | --- |',
      '| Cell | Cell | Cell |',
      '| Cell | Cell | Cell |',
    ].join('\n'))
    expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe('Header 1')
  })

  it('undoes and redoes toolbar changes', async () => {
    const user = userEvent.setup()
    render(<ControlledEditor initialValue="hello" />)

    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(0, 5)
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    expect(editor.value).toBe('**hello**')

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(editor.value).toBe('hello')

    await user.click(screen.getByRole('button', { name: 'Redo' }))
    expect(editor.value).toBe('**hello**')
  })

  it('uses platform-specific undo and redo shortcuts', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<ControlledEditor initialValue="hello" />)

    let editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(0, 5)
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    fireEvent.keyDown(editor, { key: 'z', ctrlKey: true })
    expect(editor.value).toBe('hello')
    fireEvent.keyDown(editor, { key: 'y', ctrlKey: true })
    expect(editor.value).toBe('**hello**')

    unmount()
    setNavigatorPlatform('MacIntel')
    render(<ControlledEditor initialValue="hello" />)
    editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(0, 5)
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    fireEvent.keyDown(editor, { key: 'z', metaKey: true })
    expect(editor.value).toBe('hello')
    fireEvent.keyDown(editor, { key: 'z', metaKey: true, shiftKey: true })
    expect(editor.value).toBe('**hello**')
  })

  it('applies heading levels and block commands from menus', async () => {
    const user = userEvent.setup()
    render(<ControlledEditor initialValue="Title" />)

    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    editor.setSelectionRange(0, 5)
    await user.click(screen.getByRole('button', { name: 'Heading' }))
    await user.click(screen.getByRole('menuitem', { name: 'Heading 3' }))
    expect(editor.value).toBe('### Title')

    editor.setSelectionRange(0, editor.value.length)
    await user.click(screen.getByRole('button', { name: 'Block formatting' }))
    await user.click(screen.getByRole('menuitem', { name: 'Code block' }))
    expect(editor.value).toBe('```\n### Title\n```')
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
    expect(screen.getByRole('tablist', { name: 'Syntax categories' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Basic formatting' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Basic formatting' })).toBeInTheDocument()
    expect(screen.queryByText('Relative image')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'MDView enhancements' }))

    expect(screen.getByRole('tab', { name: 'MDView enhancements' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Mermaid diagram')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close markdown syntax reference' }))

    expect(
      screen.queryByRole('dialog', { name: 'Markdown syntax reference' }),
    ).not.toBeInTheDocument()
  })

  it('supports keyboard navigation between syntax category tabs', async () => {
    const user = userEvent.setup()
    render(<MarkdownEditor value="" onChange={vi.fn()} label="Markdown source" t={labels} />)

    await user.click(screen.getByRole('button', { name: 'Markdown syntax reference' }))
    const basicTab = screen.getByRole('tab', { name: 'Basic formatting' })
    basicTab.focus()
    fireEvent.keyDown(basicTab, { key: 'ArrowRight' })

    expect(screen.getByRole('tab', { name: 'Lists and blocks' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Lists and blocks' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Lists and blocks' })).toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Lists and blocks' }), { key: 'End' })

    expect(screen.getByRole('tab', { name: 'MDView enhancements' })).toHaveFocus()
    expect(screen.getByText('Mermaid diagram')).toBeInTheDocument()
  })

  it('copies a complete multiline syntax example and announces success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<MarkdownEditor value="" onChange={vi.fn()} label="Markdown source" t={labels} />)

    await user.click(screen.getByRole('button', { name: 'Markdown syntax reference' }))
    await user.click(screen.getByRole('tab', { name: 'MDView enhancements' }))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy Mermaid diagram syntax' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        '```mermaid\nflowchart TD\n  A[Start] --> B[Finish]\n```',
      )
    })
    expect(screen.getByRole('status')).toHaveTextContent('Mermaid diagram syntax copied')
    expect(screen.getByRole('button', { name: 'Mermaid diagram syntax copied' })).toBeInTheDocument()
  })

  it('shows localized content and reports clipboard failures', async () => {
    const user = userEvent.setup()
    render(<MarkdownEditor value="" onChange={vi.fn()} label="Markdown 源码" t={translations.zh} />)

    await user.click(screen.getByRole('button', { name: 'Markdown 语法参考' }))

    expect(screen.getByRole('heading', { name: '基础排版' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '链接与媒体' }))
    expect(screen.getByText('相对路径图片')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'MDView 增强' }))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard unavailable')) },
    })
    fireEvent.click(screen.getByRole('button', { name: '复制颜色预览语法' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('无法复制语法示例。')
    })
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

  it('opens a multi-image picker from the image toolbar button and preserves the selection', async () => {
    const user = userEvent.setup()
    const onImportImages = vi.fn()
    const { container } = render(
      <MarkdownEditor
        value="hello"
        onChange={vi.fn()}
        onImportImages={onImportImages}
        supportsImageImport
        label="Markdown source"
        t={labels}
      />,
    )

    const editor = screen.getByRole('textbox', { name: 'Markdown source' }) as HTMLTextAreaElement
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).not.toBeNull()
    const clickInput = vi.spyOn(input!, 'click')
    editor.setSelectionRange(1, 4)

    await user.click(screen.getByRole('button', { name: 'Image' }))
    expect(clickInput).toHaveBeenCalledTimes(1)
    expect(input).toHaveAttribute('multiple')

    const image = new File(['image'], 'photo.png', { type: 'image/png' })
    fireEvent.change(input!, { target: { files: [image] } })
    expect(onImportImages).toHaveBeenCalledWith([image], { start: 1, end: 4 })
    expect(input).toHaveValue('')
  })

  it('shows an image drop target and disables the image button while importing', () => {
    render(
      <MarkdownEditor
        value="hello"
        onChange={vi.fn()}
        onImportImages={vi.fn()}
        supportsImageImport
        isImportingImages
        imageImportBusyLabel="Importing images 1/2"
        imageDropLabel="Drop images here"
        label="Markdown source"
        t={labels}
      />,
    )

    expect(screen.getByRole('button', { name: 'Importing images 1/2' })).toBeDisabled()

    const editor = screen.getByRole('textbox', { name: 'Markdown source' })
    fireEvent.dragEnter(editor, {
      dataTransfer: {
        files: [],
        items: [{ kind: 'file', type: 'image/png' }],
      },
    })
    expect(screen.getByRole('status')).toHaveTextContent('Drop images here')

    fireEvent.dragLeave(editor)
    expect(screen.queryByText('Drop images here')).not.toBeInTheDocument()
  })
})

function setNavigatorPlatform(platform: string) {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}

function ControlledEditor({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue)
  return <MarkdownEditor value={value} onChange={setValue} label="Markdown source" t={labels} />
}
