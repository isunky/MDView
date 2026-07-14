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
})
