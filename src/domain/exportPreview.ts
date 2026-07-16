import { renderMermaidDiagram, sanitizeMermaidSvg } from './mermaidRenderer'

export async function createLightExportContent(previewElement: HTMLElement): Promise<string> {
  const previewClone = previewElement.cloneNode(true) as HTMLElement
  const diagrams = Array.from(previewClone.querySelectorAll<HTMLElement>('[data-mdview-mermaid-chart]'))

  for (const [index, diagram] of diagrams.entries()) {
    const chart = diagram.dataset.mdviewMermaidChart
    if (!chart) {
      continue
    }

    const result = await renderMermaidDiagram(`mdview-export-mermaid-${index}`, chart, 'light')
    diagram.innerHTML = sanitizeMermaidSvg(result.svg)
    delete diagram.dataset.mdviewMermaidChart
  }

  previewClone.querySelectorAll<HTMLElement>('.search-match').forEach((match) => {
    match.replaceWith(...Array.from(match.childNodes))
  })

  return previewClone.innerHTML
}
