import { describe, expect, it } from 'vitest'
import {
  buildExportHtml,
  createExportHtmlDefaultPath,
  createExportHtmlFilename,
} from './exportHtml'

describe('export html', () => {
  it('builds a self-contained HTML document with escaped title and language', () => {
    const html = buildExportHtml({
      title: '<Report & Summary>',
      lang: 'zh-CN',
      contentHtml: '<h1>标题</h1><pre><code>const ready = true</code></pre>',
    })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<html lang="zh-CN">')
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('<title>&lt;Report &amp; Summary&gt;</title>')
    expect(html).toContain('<article class="markdown-preview" aria-label="Markdown preview">')
    expect(html).toContain('<h1>标题</h1>')
    expect(html).toContain('hljs')
  })

  it('creates default export paths from source markdown paths', () => {
    expect(createExportHtmlDefaultPath('/tmp/readme.md', 'Ignored')).toBe('/tmp/readme.html')
    expect(createExportHtmlDefaultPath('C:\\Docs\\guide.markdown', 'Ignored')).toBe(
      'C:\\Docs\\guide.html',
    )
  })

  it('creates safe HTML filenames from document titles', () => {
    expect(createExportHtmlFilename('Untitled.md')).toBe('Untitled.html')
    expect(createExportHtmlFilename('Q1: Report / Draft')).toBe('Q1- Report - Draft.html')
    expect(createExportHtmlFilename('   ')).toBe('Untitled.html')
  })
})
