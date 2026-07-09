import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('App DOCX loading', () => {
  it('loads the DOCX exporter only from the export action', () => {
    const appSource = readFileSync('src/App.tsx', 'utf8')

    expect(appSource).not.toMatch(/import\s+.+from\s+['"]\.\/domain\/exportDocx['"]/)
    expect(appSource).toContain("await import('./domain/exportDocx')")
  })
})
