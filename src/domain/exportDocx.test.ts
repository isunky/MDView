import { describe, expect, it, vi } from 'vitest'
import { buildExportDocx } from './exportDocx'
import { createExportDocxDefaultPath } from './exportDocxPath'
import JSZip from 'jszip'

describe('exportDocx', () => {
  it('exports Chinese punctuation-adjacent bold as Word formatting while preserving literal markers', async () => {
    const result = await buildExportDocx({
      title: 'Review',
      content: '1. **数据库资源保障方式仍存在明显前后矛盾。**预算表已明确。\n2. **服务器来源口径。**当前正文。\n\n`**代码。**正文`\n\n\\*\\*转义。\\*\\*正文\n\n```md\n**代码块。**正文\n```',
      sourcePath: null,
      readLocalImageFile: vi.fn(),
    })
    const zip = await JSZip.loadAsync(result.bytes)
    const xml = await zip.file('word/document.xml')!.async('string')
    const document = new DOMParser().parseFromString(xml, 'application/xml')
    const runs = Array.from(document.getElementsByTagName('w:r'))
    for (const text of ['数据库资源保障方式仍存在明显前后矛盾。', '服务器来源口径。']) {
      const run = runs.find(node => node.textContent === text)
      expect(run).toBeDefined()
      expect(run!.getElementsByTagName('w:b')).toHaveLength(1)
      expect(xml).not.toContain(`**${text}**`)
    }
    expect(xml).toContain('**代码。**正文')
    expect(xml).toContain('**转义。**正文')
    expect(xml).toContain('**代码块。**正文')
    const normal = runs.find(node => node.textContent === '预算表已明确。')!
    expect(normal.getElementsByTagName('w:b')).toHaveLength(0)
  })

  it('creates a docx default path from the current markdown file path', () => {
    expect(createExportDocxDefaultPath('C:\\Docs\\Guide\\readme.md', 'Readme')).toBe(
      'C:\\Docs\\Guide\\readme.docx',
    )
    expect(createExportDocxDefaultPath('/tmp/report.markdown', 'Report')).toBe(
      '/tmp/report.docx',
    )
  })

  it('creates a safe docx filename for unsaved documents', () => {
    expect(createExportDocxDefaultPath(null, 'Project: Plan*')).toBe('Project- Plan.docx')
    expect(createExportDocxDefaultPath(null, '   ')).toBe('Untitled.docx')
  })

  it('builds a docx zip from common markdown content', async () => {
    const result = await buildExportDocx({
      title: 'Guide',
      content: [
        '# Guide',
        '',
        'A paragraph with **bold** text and [link](https://www.sunky.net).',
        '',
        '- item one',
        '- item two',
        '',
        '| Key | Value |',
        '| --- | --- |',
        '| OS | Windows |',
        '',
        '```ts',
        'const ready = true',
        '```',
      ].join('\n'),
      sourcePath: null,
      readLocalImageFile: vi.fn(),
    })

    expect(result.bytes).toBeInstanceOf(Uint8Array)
    expect(result.bytes[0]).toBe(0x50)
    expect(result.bytes[1]).toBe(0x4b)
  })

  it('exports common formulas as editable Office Math', async () => {
    const result = await buildExportDocx({
      title: 'Math',
      content: 'Inline $x^2 + \\frac{a}{b}$.\n\n$$\n\\int_0^1 x\\,dx\n$$',
      sourcePath: null,
      readLocalImageFile: vi.fn(),
    })
    const zip = await JSZip.loadAsync(result.bytes)
    const xml = await zip.file('word/document.xml')?.async('string')

    expect(xml).toContain('<m:oMath>')
    expect(xml).toContain('<m:f>')
    expect(xml).toContain('<m:nary>')
    expect(result.formulaImageFallbacks).toBe(0)
  })
})
