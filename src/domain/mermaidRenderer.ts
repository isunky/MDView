type MermaidModule = typeof import('mermaid')

let mermaidModulePromise: Promise<MermaidModule['default']> | null = null

function loadMermaid() {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'default',
      })
      return mermaid
    })
  }

  return mermaidModulePromise
}

export async function renderMermaidDiagram(id: string, chart: string) {
  const mermaid = await loadMermaid()
  return mermaid.render(id, chart)
}
