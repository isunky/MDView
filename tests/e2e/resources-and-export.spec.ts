import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state = { html: 0, docx: 0, pdf: 0, imageReads: 0 }
    const win = window as typeof window & { __MDVIEW_E2E_FILE_ACCESS__?: unknown; __MDVIEW_RESOURCE_STATE__?: typeof state }
    win.__MDVIEW_RESOURCE_STATE__ = state
    win.__MDVIEW_E2E_FILE_ACCESS__ = {
      supportsNativeFiles: true,
      supportsImageImport: true,
      openMarkdownFile: async () => null,
      openMarkdownFileAtPath: async (path: string) => ({ path, content: '# Opened' }),
      revealFileInFolder: async () => undefined,
      saveMarkdownFile: async (path: string) => path,
      saveMarkdownFileAs: async () => 'C:\\Docs\\Saved.md',
      exportHtmlFile: async () => { state.html += 1; return 'C:\\Docs\\Export.html' },
      exportDocxFile: async () => { state.docx += 1; return 'C:\\Docs\\Export.docx' },
      printExportHtml: async () => { state.pdf += 1 },
      readLocalImageFile: async (path: string) => {
        state.imageReads += 1
        return { path, dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }
      },
      writeImageAsset: async () => ({ path: 'C:\\Docs\\assets\\image.png', relativePath: 'assets/image.png', filename: 'image.png' }),
      readStartupMarkdownFile: async () => null,
      listenForOpenedFiles: async () => null,
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Create new markdown file' }).click()
})

test('renders local images and Mermaid diagrams', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'Markdown source' })
  await editor.fill('# Resources\n\n![Pixel](assets/pixel.png)\n\n```mermaid\ngraph TD\nA[Start] --> B[Done]\n```')
  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Save', exact: true }).click()
  await page.getByRole('button', { name: 'Preview markdown' }).click()

  await expect(page.getByRole('img', { name: 'Pixel' })).toHaveAttribute('src', /^data:image\/png/)
  await expect(page.getByRole('img', { name: 'Mermaid diagram' })).toBeVisible({ timeout: 15_000 })
})

test('runs HTML, PDF, and DOCX exports', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Markdown source' }).fill('# Export document')
  await page.getByRole('button', { name: 'Preview markdown' }).click()

  for (const name of ['Export as HTML', 'Export as PDF', 'Export as Word (.docx)']) {
    await page.getByRole('button', { name: 'Export', exact: true }).click()
    await page.getByRole('menuitem', { name }).click()
  }

  await expect.poll(() => page.evaluate(() => (window as typeof window & { __MDVIEW_RESOURCE_STATE__?: { html: number } }).__MDVIEW_RESOURCE_STATE__?.html)).toBe(1)
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __MDVIEW_RESOURCE_STATE__?: { pdf: number } }).__MDVIEW_RESOURCE_STATE__?.pdf)).toBe(1)
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __MDVIEW_RESOURCE_STATE__?: { docx: number } }).__MDVIEW_RESOURCE_STATE__?.docx)).toBe(1)
})

test('keeps a long preview scrollable', async ({ page }) => {
  const content = Array.from({ length: 300 }, (_, index) => `## Section ${index + 1}\n\nParagraph ${index + 1}.`).join('\n\n')
  await page.getByRole('textbox', { name: 'Markdown source' }).fill(content)
  await page.getByRole('button', { name: 'Preview markdown' }).click()
  const preview = page.getByLabel('Preview panel')
  await expect(preview.getByRole('heading', { name: 'Section 300' })).toBeAttached()
  await preview.evaluate((element) => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event('scroll')) })
  await expect.poll(() => preview.evaluate((element) => element.scrollTop)).toBeGreaterThan(100)
})
