import { describe, expect, it, vi } from 'vitest'

const renderMermaidDiagram = vi.hoisted(() => vi.fn())

vi.mock('./mermaidRenderer', () => ({
  renderMermaidDiagram,
  sanitizeMermaidSvg: (svg: string) => svg,
}))

describe('createLightExportContent', () => {
  it('re-renders Mermaid diagrams in light mode and removes search wrappers', async () => {
    renderMermaidDiagram.mockResolvedValue({ svg: '<svg data-theme="light" />' })
    const { createLightExportContent } = await import('./exportPreview')
    const preview = document.createElement('article')
    preview.innerHTML = '<div class="mermaid-diagram" data-mdview-mermaid-chart="graph TD"></div><p><mark class="search-match">match</mark></p>'

    await expect(createLightExportContent(preview, {
      sourcePath: '/tmp/report.md',
      readLocalImageFile: async () => ({ dataUrl: 'data:image/png;base64,local' }),
    })).resolves.toEqual({
      html: '<div class="mermaid-diagram"><svg data-theme="light"></svg></div><p>match</p>',
      unresolvedResources: [],
    })
    expect(renderMermaidDiagram).toHaveBeenCalledWith('mdview-export-mermaid-0', 'graph TD', 'light')
  })

  it('embeds local and remote images while reporting resources that cannot be read', async () => {
    const { createLightExportContent } = await import('./exportPreview')
    const preview = document.createElement('article')
    preview.innerHTML = '<img src="images/local.png"><img src="https://example.com/remote.png"><img src="https://example.com/remote.png"><img src="missing.png">'
    const readLocalImageFile = vi.fn(async (path: string) => {
      if (path.endsWith('local.png')) return { dataUrl: 'data:image/png;base64,local' }
      throw new Error('missing')
    })
    const readRemoteImageFile = vi.fn(async () => ({ dataUrl: 'data:image/png;base64,remote' }))

    await expect(createLightExportContent(preview, {
      sourcePath: '/tmp/report.md',
      readLocalImageFile,
      readRemoteImageFile,
    })).resolves.toEqual({
      html: '<img src="data:image/png;base64,local"><img src="data:image/png;base64,remote"><img src="data:image/png;base64,remote"><img src="missing.png">',
      unresolvedResources: ['missing.png'],
    })
    expect(readLocalImageFile).toHaveBeenCalledWith('/tmp/images/local.png')
    expect(readRemoteImageFile).toHaveBeenCalledWith('https://example.com/remote.png')
    expect(readRemoteImageFile).toHaveBeenCalledTimes(1)
  })

  it('removes internal split-scroll source attributes from export output', async () => {
    const { createLightExportContent } = await import('./exportPreview')
    const preview = document.createElement('article')
    preview.innerHTML = '<p data-mdview-source-start="3" data-mdview-source-end="4">Content</p>'

    await expect(createLightExportContent(preview, {
      sourcePath: null,
      readLocalImageFile: async () => ({ dataUrl: 'data:image/png;base64,local' }),
    })).resolves.toEqual({
      html: '<p>Content</p>',
      unresolvedResources: [],
    })
  })
})
