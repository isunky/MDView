import { describe, expect, it } from 'vitest'
import { applyHeading, applyInlineCommand, applyListContinuation, applyPastedLink, type InlineMarkdownCommand } from './editorCommands'

function continueAtEnd(value: string) {
  return applyListContinuation(value, { start: value.length, end: value.length })
}

describe('pasting links', () => {
  it('wraps selected text and leaves the cursor after the link', () => {
    const edit = applyPastedLink('visit project now', { start: 6, end: 13 }, 'https://example.com/docs')
    const result = 'visit [project](https://example.com/docs) now'
    expect(edit).toEqual({ value: result, selection: { start: result.indexOf(' now'), end: result.indexOf(' now') } })
  })

  it('preserves link labels and destinations containing Markdown punctuation', () => {
    const edit = applyPastedLink('a [b]', { start: 0, end: 5 }, ' https://example.com/a(b)?q=1&amp;x=2\n')
    expect(edit?.value).toBe('[a \\[b\\]](https://example.com/a%28b%29?q=1&amp;amp;x=2)')
    expect(applyPastedLink('\\[a\\]', { start: 0, end: 5 }, 'https://example.com')?.value).toBe('[\\[a\\]](https://example.com/)')
  })

  it.each([
    ['hello', 0, 0, 'https://example.com'],
    ['  ', 0, 2, 'https://example.com'],
    ['line\nbreak', 0, 10, 'https://example.com'],
    ['hello', 0, 5, 'plain text'],
    ['hello', 0, 5, 'javascript:alert(1)'],
    ['hello', 0, 5, 'https://example.com/a b'],
    ['hello', 0, 5, 'https://'],
  ])('leaves ordinary or unsupported pastes untouched', (value, start, end, clipboard) => {
    expect(applyPastedLink(value, { start, end }, clipboard)).toBeNull()
  })
})

describe('list continuation', () => {
  it.each([
    ['- first', '- first\n- '],
    ['* first', '* first\n* '],
    ['+ first', '+ first\n+ '],
    ['9. first', '9. first\n10. '],
    ['2) first', '2) first\n3) '],
    ['  * [x] done', '  * [x] done\n  * [ ] '],
    ['- parent\n\t+ [X] done', '- parent\n\t+ [X] done\n\t+ [ ] '],
    ['1. [ ] todo', '1. [ ] todo\n2. [ ] '],
  ])('continues %s', (input, expected) => {
    expect(continueAtEnd(input)).toEqual({ value: expected, selection: { start: expected.length, end: expected.length } })
  })

  it('exits empty lists and returns empty nested items to the parent level', () => {
    expect(continueAtEnd('- [x] ')?.value).toBe('')
    expect(continueAtEnd('- [x]')?.value).toBe('')
    expect(continueAtEnd('2. parent\n   * child\n   * ')?.value).toBe('2. parent\n   * child\n3. ')
    expect(continueAtEnd('- parent\n  + ')?.value).toBe('- parent\n- ')
  })

  it('preserves text after the cursor and does not mistake it for an empty item', () => {
    const value = '- hello world'
    expect(applyListContinuation(value, { start: 7, end: 7 })?.value).toBe('- hello\n-  world')
    expect(applyListContinuation(value, { start: 2, end: 2 })?.value).toBe('- \n- hello world')
    expect(applyListContinuation(value, { start: 0, end: 3 })).toBeNull()
  })

  it('leaves list-like content inside fenced code alone', () => {
    expect(continueAtEnd('```md\n- example')).toBeNull()
    expect(continueAtEnd('- parent\n  ~~~md\n  * example')).toBeNull()
    expect(continueAtEnd('    - indented code')).toBeNull()
    expect(continueAtEnd('\t- indented code')).toBeNull()
    expect(continueAtEnd('```\n- example\n```\n- real')?.value).toBe('```\n- example\n```\n- real\n- ')
  })
})

describe('format toggles', () => {
  it.each([
    ['bold', '**'], ['italic', '*'], ['code', '`'],
  ] as const)('applies and removes %s while preserving the selection', (command, marker) => {
    const formatted = applyInlineCommand('hello', { start: 0, end: 5 }, command)
    expect(formatted.value).toBe(`${marker}hello${marker}`)
    expect(formatted.selection).toEqual({ start: marker.length, end: marker.length + 5 })
    const removed = applyInlineCommand(formatted.value, formatted.selection, command)
    expect(removed).toEqual({ value: 'hello', selection: { start: 0, end: 5 } })
    expect(applyInlineCommand(formatted.value, { start: 0, end: formatted.value.length }, command).value).toBe('hello')
  })

  it('handles underscore formatting without treating bold or literal underscores as italic', () => {
    expect(applyInlineCommand('__text__', { start: 2, end: 6 }, 'bold').value).toBe('text')
    expect(applyInlineCommand('_text_', { start: 1, end: 5 }, 'italic').value).toBe('text')
    expect(applyInlineCommand('**text**', { start: 2, end: 6 }, 'italic').value).toBe('***text***')
    expect(applyInlineCommand('***text***', { start: 3, end: 7 }, 'italic').value).toBe('**text**')
    expect(applyInlineCommand('***text***', { start: 3, end: 7 }, 'bold').value).toBe('*text*')
    expect(applyInlineCommand('foo_bar_', { start: 4, end: 7 }, 'italic').value).toBe('foo_*bar*_')
  })

  it('toggles a heading level and changes a different level', () => {
    const heading = applyHeading('  Hello', { start: 2, end: 7 }, 2)
    expect(heading.value).toBe('  ## Hello')
    expect(applyHeading(heading.value, heading.selection, 2).value).toBe('  Hello')
    expect(applyHeading('# Hello', { start: 0, end: 7 }, 2).value).toBe('## Hello')
    expect(applyHeading('# A\n\nplain', { start: 0, end: 10 }, 1).value).toBe('# A\n\n# plain')
  })

  it.each([
    ['quote', '> ', '> '],
    ['unordered-list', '- ', '* '],
    ['ordered-list', '1. ', '2) '],
    ['task-list', '- [ ] ', '+ [x] '],
  ] as [InlineMarkdownCommand, string, string][])('toggles %s on multiline selections', (command, prefix, alternative) => {
    const plain = '  first\n\n  second'
    const applied = applyInlineCommand(plain, { start: 0, end: plain.length }, command)
    expect(applied.value).toBe(`  ${prefix}first\n\n  ${prefix}second`)
    expect(applyInlineCommand(applied.value, applied.selection, command).value).toBe(plain)
    const existing = `  ${alternative}first`
    expect(applyInlineCommand(existing, { start: 0, end: existing.length }, command).value).toBe('  first')
  })

  it('normalizes mixed lines without stacking list markers or losing task state', () => {
    const value = '- first\nsecond\n+ third'
    expect(applyInlineCommand(value, { start: 0, end: value.length }, 'unordered-list').value).toBe('- first\n- second\n+ third')
    expect(applyInlineCommand('- [x] done', { start: 0, end: 10 }, 'ordered-list').value).toBe('1. [x] done')
  })
})
