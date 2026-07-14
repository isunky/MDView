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
