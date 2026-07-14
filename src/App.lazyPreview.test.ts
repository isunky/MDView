import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('App preview loading', () => {
  it('loads the Markdown preview only after the workspace is needed', () => {
    const appSource = readFileSync('src/App.tsx', 'utf8')

    expect(appSource).not.toMatch(/import\s+\{\s*MarkdownPreview\s*\}\s+from/)
    expect(appSource).toContain('LazyMarkdownPreview')
    expect(appSource).toContain('preloadMarkdownPreview')
  })
})
