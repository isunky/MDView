import { describe, expect, it } from 'vitest'
import { applyMathExpression, containsMarkdownMath, findMathExpression } from './markdownMath'

describe('markdown math editing', () => {
  it('detects math without treating escaped dollars as formulas', () => {
    expect(containsMarkdownMath('Price: \\$10')).toBe(false)
    expect(containsMarkdownMath('Energy: $E=mc^2$')).toBe(true)
  })

  it('finds inline and block formulas at the cursor', () => {
    expect(findMathExpression('Value $x^2$ here', { start: 8, end: 8 })).toMatchObject({ latex: 'x^2', mode: 'inline' })
    expect(findMathExpression('Before\n$$\n\\frac{a}{b}\n$$\nAfter', { start: 14, end: 14 })).toMatchObject({ latex: '\\frac{a}{b}', mode: 'block' })
  })

  it('inserts a block formula and replaces an existing formula', () => {
    expect(applyMathExpression('', { start: 0, end: 0 }, 'x^2', 'block').value).toBe('$$\nx^2\n$$')
    const source = 'Value $x$ here'
    const expression = findMathExpression(source, { start: 8, end: 8 })
    expect(applyMathExpression(source, { start: 8, end: 8 }, 'x^2', 'inline', expression).value).toBe('Value $x^2$ here')
  })
})
