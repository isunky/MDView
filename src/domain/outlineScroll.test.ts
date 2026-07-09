import { describe, expect, it } from 'vitest'
import { findActiveOutlineId, type OutlineHeadingPosition } from './outlineScroll'

describe('findActiveOutlineId', () => {
  const headings: OutlineHeadingPosition[] = [
    { id: 'intro', top: 80 },
    { id: 'setup', top: 320 },
    { id: 'usage', top: 760 },
  ]

  it('uses the first heading before the preview reaches a heading', () => {
    expect(findActiveOutlineId(headings, 0, 24)).toBe('intro')
  })

  it('selects the last heading at or above the activation line', () => {
    expect(findActiveOutlineId(headings, 296, 24)).toBe('setup')
    expect(findActiveOutlineId(headings, 735, 24)).toBe('setup')
    expect(findActiveOutlineId(headings, 736, 24)).toBe('usage')
  })

  it('returns null when no headings are available', () => {
    expect(findActiveOutlineId([], 200, 24)).toBeNull()
  })

  it('finds the active heading in a large sorted index', () => {
    const manyHeadings = Array.from({ length: 10_000 }, (_, index) => ({
      id: `heading-${index}`,
      top: index * 100,
    }))

    expect(findActiveOutlineId(manyHeadings, 543_226, 24)).toBe('heading-5432')
  })
})
