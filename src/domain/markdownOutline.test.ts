import { describe, expect, it } from 'vitest'
import { extractMarkdownOutline } from './markdownOutline'

describe('extractMarkdownOutline', () => {
  it('extracts H1-H5 headings with stable unique ids', () => {
    expect(
      extractMarkdownOutline(
        ['# Project Plan', '## Scope', '### Details', '#### Notes', '##### Appendix', '###### Hidden', '## Scope'].join('\n'),
      ),
    ).toEqual([
      { id: 'project-plan', level: 1, text: 'Project Plan' },
      { id: 'scope', level: 2, text: 'Scope' },
      { id: 'details', level: 3, text: 'Details' },
      { id: 'notes', level: 4, text: 'Notes' },
      { id: 'appendix', level: 5, text: 'Appendix' },
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

  it('uses visible heading text instead of inline Markdown syntax', () => {
    expect(
      extractMarkdownOutline(
        [
          '## **（一）整体情况说明**',
          '### **1. [系统平台](https://example.com)**',
          '#### `配置项`与~~旧内容~~',
        ].join('\n'),
      ),
    ).toEqual([
      { id: '一整体情况说明', level: 2, text: '（一）整体情况说明' },
      { id: '1-系统平台', level: 3, text: '1. 系统平台' },
      { id: '配置项与旧内容', level: 4, text: '配置项与旧内容' },
    ])
  })
})
