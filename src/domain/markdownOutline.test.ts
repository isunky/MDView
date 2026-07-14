import { describe, expect, it } from 'vitest'
import { extractMarkdownOutline } from './markdownOutline'

describe('extractMarkdownOutline', () => {
  it('extracts H1-H4 headings with stable unique ids', () => {
    expect(
      extractMarkdownOutline(
        ['# Project Plan', '## Scope', '### Details', '#### Notes', '##### Hidden', '## Scope'].join('\n'),
      ),
    ).toEqual([
      { id: 'project-plan', level: 1, text: 'Project Plan' },
      { id: 'scope', level: 2, text: 'Scope' },
      { id: 'details', level: 3, text: 'Details' },
      { id: 'notes', level: 4, text: 'Notes' },
      { id: 'scope-2', level: 2, text: 'Scope' },
    ])
  })

  it('ignores headings inside fenced code blocks', () => {
    expect(
      extractMarkdownOutline(
        ['# Visible', '```md', '## Hidden', '```', '~~~', '### Also hidden', '~~~', '## Next'].join(
          '\n',
        ),
      ),
    ).toEqual([
      { id: 'visible', level: 1, text: 'Visible' },
      { id: 'next', level: 2, text: 'Next' },
    ])
  })

  it('keeps unicode words and removes punctuation from ids', () => {
    expect(extractMarkdownOutline('# 你好，MDView!')).toEqual([
      { id: '你好mdview', level: 1, text: '你好，MDView!' },
    ])
  })
})
