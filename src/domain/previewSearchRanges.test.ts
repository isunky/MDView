import { describe, expect, it } from 'vitest'
import { findPreviewSearchRanges } from './previewSearchRanges'

describe('preview search ranges', () => {
  it('matches visible text case-insensitively and treats punctuation literally', () => {
    const article = document.createElement('article')
    article.innerHTML = '<p>A+B and a+b, but not aab.</p><pre><code>A+B</code></pre>'
    expect(findPreviewSearchRanges(article, 'a+b').map((range) => range.toString())).toEqual(['A+B', 'a+b', 'A+B'])
  })

  it('excludes generated controls, diagrams, and formula text', () => {
    const article = document.createElement('article')
    article.innerHTML = '<p>find me</p><figure class="code-block"><figcaption class="code-block-header">find</figcaption><pre>find</pre></figure><div class="mermaid-diagram">find</div><span class="katex">find</span>'
    expect(findPreviewSearchRanges(article, 'find')).toHaveLength(2)
    expect(findPreviewSearchRanges(article, '')).toHaveLength(0)
  })
})
