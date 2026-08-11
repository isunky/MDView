import { describe, expect, it } from 'vitest'
import { createMarkdownSuggestedFilename } from './markdownFilename'

describe('createMarkdownSuggestedFilename', () => {
  it('uses the first meaningful line before later headings', () => {
    expect(createMarkdownSuggestedFilename('\n会议记录\n\n# 项目说明')).toBe('会议记录.md')
  })

  it('removes heading and inline Markdown syntax', () => {
    expect(createMarkdownSuggestedFilename('## **项目 [说明](https://example.com)**')).toBe('项目 说明.md')
  })

  it.each([1, 2, 3, 4, 5, 6])('supports H%s headings', (level) => {
    expect(createMarkdownSuggestedFilename(`${'#'.repeat(level)} 层级标题`)).toBe('层级标题.md')
  })

  it('keeps meaningful hash characters in heading text', () => {
    expect(createMarkdownSuggestedFilename('# C# 开发指南')).toBe('C# 开发指南.md')
  })

  it('extracts visible text from lists and blockquotes', () => {
    expect(createMarkdownSuggestedFilename('- 第一项')).toBe('第一项.md')
    expect(createMarkdownSuggestedFilename('> 重要说明')).toBe('重要说明.md')
  })

  it('ignores fenced and indented code before document text', () => {
    const content = '```ts\nconst hidden = true\n```\n\n    also hidden\n\n# 可见标题'
    expect(createMarkdownSuggestedFilename(content)).toBe('可见标题.md')
  })

  it('creates a cross-platform safe filename', () => {
    expect(createMarkdownSuggestedFilename('# 报告: 第一版 / 评审?')).toBe('报告- 第一版 - 评审.md')
    expect(createMarkdownSuggestedFilename('# CON')).toBe('CON-document.md')
    expect(createMarkdownSuggestedFilename('# CON.txt')).toBe('CON-document.txt.md')
  })

  it('limits long filename stems without splitting Unicode characters', () => {
    const title = '文'.repeat(90)
    expect(createMarkdownSuggestedFilename(`# ${title}`)).toBe(`${'文'.repeat(80)}.md`)
  })

  it('falls back for empty content and keeps the starter title behavior', () => {
    expect(createMarkdownSuggestedFilename('   \n\n---')).toBe('Untitled.md')
    expect(createMarkdownSuggestedFilename('# Untitled\n\nStart writing or open a Markdown file.')).toBe('Untitled.md')
  })
})
