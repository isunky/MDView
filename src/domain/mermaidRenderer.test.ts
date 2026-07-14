import { beforeEach, describe, expect, it, vi } from 'vitest'

const mermaid = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}))

vi.mock('mermaid', () => ({ default: mermaid }))

describe('mermaidRenderer', () => {
  beforeEach(() => {
    vi.resetModules()
    mermaid.initialize.mockReset()
    mermaid.render.mockReset()
  })

  it('loads and initializes Mermaid once while rendering multiple diagrams', async () => {
    mermaid.render.mockImplementation(async (id: string, chart: string) => ({
      svg: `<svg id="${id}" data-chart="${chart}" />`,
    }))
    const { renderMermaidDiagram } = await import('./mermaidRenderer')

    await renderMermaidDiagram('first', 'graph TD')
    await renderMermaidDiagram('second', 'sequenceDiagram')

    expect(mermaid.initialize).toHaveBeenCalledTimes(1)
    expect(mermaid.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'default',
    })
    expect(mermaid.render).toHaveBeenNthCalledWith(1, 'first', 'graph TD')
    expect(mermaid.render).toHaveBeenNthCalledWith(2, 'second', 'sequenceDiagram')
  })

  it('removes active content and dangerous URLs from Mermaid SVG output', async () => {
    const { sanitizeMermaidSvg } = await import('./mermaidRenderer')
    const sanitized = sanitizeMermaidSvg([
      '<svg xmlns="http://www.w3.org/2000/svg">',
      '<script>alert(1)</script>',
      '<foreignObject><iframe src="https://example.com" /></foreignObject>',
      '<a href="javascript:alert(1)" onclick="alert(1)"><text>Unsafe</text></a>',
      '<a href="https://example.com"><text>External</text></a>',
      '<style>@import url(https://example.com/theme.css);</style>',
      '<rect style="fill:red; background:url(https://example.com/pixel)" />',
      '<path marker-end="url(#safe-marker)" />',
      '<text>Safe</text>',
      '</svg>',
    ].join(''))

    expect(sanitized).not.toMatch(/script|foreignObject|iframe|javascript:|onclick|https:\/\//i)
    expect(sanitized).toContain('url(#safe-marker)')
    expect(sanitized).toContain('Safe')
  })

  it('rejects non-SVG Mermaid output', async () => {
    const { sanitizeMermaidSvg } = await import('./mermaidRenderer')

    expect(() => sanitizeMermaidSvg('<html><body>Not SVG</body></html>')).toThrow(
      'Mermaid returned an invalid SVG document.',
    )
  })
})
