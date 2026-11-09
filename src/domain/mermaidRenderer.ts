type MermaidModule = typeof import('mermaid')
export type MermaidTheme = 'light' | 'dark'

let mermaidModulePromise: Promise<MermaidModule['default']> | null = null
let configuredTheme: MermaidTheme | null = null
let renderQueue: Promise<void> = Promise.resolve()

function loadMermaid() {
  if (!mermaidModulePromise) {
    // Mermaid 12 requires ES2024; older WebKit versions still use Mermaid 11.
    const supportsES2024 = 'groupBy' in Object && 'withResolvers' in Promise && 'transfer' in ArrayBuffer.prototype
    const module = supportsES2024 ? import('mermaid') : import('mermaid-legacy')
    mermaidModulePromise = module.then(({ default: mermaid }) => mermaid as unknown as MermaidModule['default'])
  }

  return mermaidModulePromise
}

export function renderMermaidDiagram(id: string, chart: string, theme: MermaidTheme = 'light') {
  const renderTask = renderQueue.then(async () => {
    const mermaid = await loadMermaid()
    if (configuredTheme !== theme) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        // Keep labels in SVG <text> nodes so the safety sanitizer can retain them.
        htmlLabels: false,
        layout: 'dagre',
        look: 'classic',
        theme: theme === 'dark' ? 'dark' : 'default',
      })
      configuredTheme = theme
    }
    return mermaid.render(id, chart)
  })

  renderQueue = renderTask.then(() => undefined, () => undefined)
  return renderTask
}

const blockedSvgElements = 'script, foreignObject, iframe, object, embed'
const safeSvgFragmentPattern = /^\s*#[A-Za-z_][\w:.-]*\s*$/
const unsafeSvgStylePattern = /(?:expression\s*\(|@import|url\s*\(\s*(?!["']?#))/i

export function sanitizeMermaidSvg(svg: string): string {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = document.documentElement

  if (root.tagName.toLowerCase() === 'parsererror' || root.tagName.toLowerCase() !== 'svg') {
    throw new Error('Mermaid returned an invalid SVG document.')
  }

  root.querySelectorAll(blockedSvgElements).forEach((element) => element.remove())
  root.querySelectorAll('style').forEach((element) => {
    if (unsafeSvgStylePattern.test(element.textContent ?? '')) {
      element.remove()
    }
  })
  root.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value

      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name)
        continue
      }

      if ((name === 'href' || name === 'xlink:href') && !safeSvgFragmentPattern.test(value)) {
        element.removeAttribute(attribute.name)
        continue
      }

      if (unsafeSvgStylePattern.test(value)) {
        element.removeAttribute(attribute.name)
      }
    }
  })

  return new XMLSerializer().serializeToString(root)
}
