import { describe, expect, it } from 'vitest'
import { findTextMatches, replaceAllTextMatches, replaceTextMatch } from './documentSearch'

describe('document search', () => {
  it('finds literal, case-insensitive, non-overlapping matches', () => {
    expect(findTextMatches('Read read re-read', 'read')).toEqual([
      { start: 0, end: 4 },
      { start: 5, end: 9 },
      { start: 13, end: 17 },
    ])
  })

  it('treats regular expression characters as literal text', () => {
    expect(findTextMatches('a+b aab a+b', 'a+b')).toEqual([
      { start: 0, end: 3 },
      { start: 8, end: 11 },
    ])
  })

  it('replaces the selected or every match without replacement interpolation', () => {
    const content = 'Read read'
    expect(replaceTextMatch(content, { start: 0, end: 4 }, '$1')).toBe('$1 read')
    expect(replaceAllTextMatches(content, 'read', '$1')).toBe('$1 $1')
  })
})
