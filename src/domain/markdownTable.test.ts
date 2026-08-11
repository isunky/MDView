import { describe, expect, it } from 'vitest'
import { createMarkdownTable } from './markdownTable'

const labels = {
  header: (column: number) => `Header ${column}`,
  cell: 'Cell',
}

describe('createMarkdownTable', () => {
  it('creates a GFM table whose row count includes the header', () => {
    expect(createMarkdownTable(3, 3, labels)).toBe([
      '| Header 1 | Header 2 | Header 3 |',
      '| --- | --- | --- |',
      '| Cell | Cell | Cell |',
      '| Cell | Cell | Cell |',
    ].join('\n'))
  })

  it('supports a header-only table and clamps dimensions', () => {
    expect(createMarkdownTable(0, 0, labels)).toBe('| Header 1 |\n| --- |')
    expect(createMarkdownTable(10, 1, labels).split('\n')[0]).toBe(
      '| Header 1 | Header 2 | Header 3 | Header 4 | Header 5 | Header 6 |',
    )
  })
})
