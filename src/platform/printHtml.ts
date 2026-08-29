import { createExportDisplayTitle } from '../domain/exportDisplayTitle'

const PRINT_RESOURCE_TIMEOUT_MS = 10_000
const PRINT_LAYER_CLEANUP_TIMEOUT_MS = 5 * 60_000

let activePrintCleanup: (() => void) | null = null

export async function printHtmlInBrowser(html: string, title: string): Promise<void> {
  activePrintCleanup?.()

  const exportDocument = new DOMParser().parseFromString(html, 'text/html')
  const printLayer = document.createElement('div')
  printLayer.className = 'mdview-print-root'
  printLayer.setAttribute('aria-hidden', 'true')
  printLayer.innerHTML = exportDocument.body.innerHTML
  Object.assign(printLayer.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '940px',
    visibility: 'hidden',
    pointerEvents: 'none',
  })

  const printStyles = document.createElement('style')
  printStyles.className = 'mdview-print-styles'
  printStyles.media = 'print'
  printStyles.textContent = [
    ...Array.from(exportDocument.querySelectorAll('style'), (style) => style.textContent ?? ''),
    createPrintOverrideStyles(createExportDisplayTitle(title)),
  ].join('\n')

  document.head.append(printStyles)
  document.body.append(printLayer)

  const previousTitle = document.title
  document.title = title

  try {
    await waitForPrintResources(printLayer)
  } catch (error) {
    printStyles.remove()
    printLayer.remove()
    document.title = previousTitle
    throw error
  }

  const cleanup = () => {
    window.clearTimeout(cleanupTimeoutId)
    window.removeEventListener('afterprint', cleanup)
    printStyles.remove()
    printLayer.remove()
    document.title = previousTitle
    if (activePrintCleanup === cleanup) activePrintCleanup = null
  }
  activePrintCleanup = cleanup
  window.addEventListener('afterprint', cleanup, { once: true })
  const cleanupTimeoutId = window.setTimeout(cleanup, PRINT_LAYER_CLEANUP_TIMEOUT_MS)

  try {
    window.focus()
    window.print()
  } catch (error) {
    cleanup()
    throw error
  }
}

function createPrintOverrideStyles(title: string): string {
  const safeTitle = escapeCssString(title || 'MDView')

  return `
@page {
  margin: 20mm 14mm 20mm;

  @top-center {
    content: "${safeTitle}";
    color: #667085;
    font: 9pt/1.2 'Segoe UI Variable Text', 'Segoe UI', 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif;
  }

  @bottom-center {
    content: counter(page);
    color: #667085;
    font: 9pt/1 'Segoe UI Variable Text', 'Segoe UI', 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif;
  }
}

@media print {
  html,
  body {
    width: auto !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: #fff !important;
  }

  body > *:not(.mdview-print-root) {
    display: none !important;
  }

  body > .mdview-print-root {
    display: block !important;
    position: static !important;
    left: auto !important;
    top: auto !important;
    width: auto !important;
    visibility: visible !important;
    pointer-events: auto !important;
  }

  .mdview-print-root .markdown-preview {
    width: auto;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .mdview-print-root h1,
  .mdview-print-root h2,
  .mdview-print-root h3,
  .mdview-print-root h4,
  .mdview-print-root h5,
  .mdview-print-root h6 {
    break-after: avoid-page;
  }

  .mdview-print-root p,
  .mdview-print-root li,
  .mdview-print-root blockquote {
    orphans: 3;
    widows: 3;
  }

  .mdview-print-root pre,
  .mdview-print-root blockquote,
  .mdview-print-root figure,
  .mdview-print-root img {
    break-inside: avoid-page;
  }
}
`
}

function escapeCssString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n\f]/g, ' ')
}

async function waitForPrintResources(root: HTMLElement): Promise<void> {
  let timeoutId: number | undefined
  const timeout = new Promise<void>((resolve) => {
    timeoutId = window.setTimeout(resolve, PRINT_RESOURCE_TIMEOUT_MS)
  })
  const resources = Promise.all([
    waitForFonts(document),
    Promise.all(Array.from(root.querySelectorAll('img'), waitForImage)),
  ]).then(() => undefined)

  await Promise.race([resources, timeout])
  if (timeoutId !== undefined) window.clearTimeout(timeoutId)

  await nextAnimationFrame()
  await nextAnimationFrame()
}

async function waitForFonts(targetDocument: Document): Promise<void> {
  if (!targetDocument.fonts) return

  try {
    await targetDocument.fonts.ready
  } catch {
    // A failed font must not block the print dialog.
  }
}

async function waitForImage(image: HTMLImageElement): Promise<void> {
  if (!image.complete) {
    await new Promise<void>((resolve) => {
      const finish = () => {
        image.removeEventListener('load', finish)
        image.removeEventListener('error', finish)
        resolve()
      }
      image.addEventListener('load', finish, { once: true })
      image.addEventListener('error', finish, { once: true })
      if (image.complete) finish()
    })
  }

  if (typeof image.decode !== 'function') return

  try {
    await image.decode()
  } catch {
    // Broken images remain visible as fallbacks and do not block printing.
  }
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve())
      return
    }

    window.setTimeout(resolve, 0)
  })
}
