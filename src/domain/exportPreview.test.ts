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

    await expect(createLightExportContent(preview)).resolves.toBe('<div class="mermaid-diagram"><svg data-theme="light"></svg></div><p>match</p>')
    expect(renderMermaidDiagram).toHaveBeenCalledWith('mdview-export-mermaid-0', 'graph TD', 'light')
  })
})
