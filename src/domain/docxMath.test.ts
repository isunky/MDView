import { describe, expect, it } from 'vitest'
import { convertLatexToDocxMath } from './docxMath'

describe('docxMath', () => {
  it('converts common LaTeX into editable Office Math', () => {
    expect(convertLatexToDocxMath('x^2 + \\frac{a}{b}')).not.toBeNull()
    expect(convertLatexToDocxMath('\\int_0^1 x\\,dx')).not.toBeNull()
  })

  it('returns null for advanced environments that require an image fallback', () => {
    expect(convertLatexToDocxMath('\\begin{matrix}a & b \\\\ c & d\\end{matrix}')).toBeNull()
  })
})
