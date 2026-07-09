import { describe, expect, it, vi } from 'vitest'
import { buildExportDocx } from './exportDocx'
import { createExportDocxDefaultPath } from './exportDocxPath'

describe('exportDocx', () => {
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
    const bytes = await buildExportDocx({
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

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
  })
})
