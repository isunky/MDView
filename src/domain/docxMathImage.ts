import katex from 'katex'
import { toPng } from 'html-to-image'
import 'katex/dist/katex.min.css'

export async function renderLatexToPng(latex: string, displayMode: boolean): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;padding:18px 24px;color:#111827;background:#fff;font-size:20px;white-space:nowrap;'
  host.innerHTML = katex.renderToString(latex, { displayMode, output: 'html', throwOnError: true, trust: false })
  document.body.append(host)
  try {
    const width = Math.max(80, Math.ceil(host.scrollWidth))
    const height = Math.max(48, Math.ceil(host.scrollHeight))
    const dataUrl = await toPng(host, { backgroundColor: '#ffffff', pixelRatio: 2, width, height })
    return { bytes: dataUrlToBytes(dataUrl), width: Math.min(600, width), height: Math.min(240, height) }
  } finally {
    host.remove()
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.split(',', 2)[1]
  if (!encoded) throw new Error('Formula image data is invalid')
  const binary = atob(encoded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}
