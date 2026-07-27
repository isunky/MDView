import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'en-US',
    })
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      value: ['en-US'],
    })

    const selectedPath = 'C:\\Docs\\E2E Opened.md'
    const files: Record<string, string> = {
      [selectedPath]: '# E2E Opened\n\nThis file was loaded by Playwright.\n',
    }
    const state = {
      savedContent: null as string | null,
      savedPath: null as string | null,
    }
    const win = window as typeof window & {
      __MDVIEW_E2E_FILE_ACCESS__?: unknown
      __MDVIEW_E2E_STATE__?: typeof state
    }

    localStorage.clear()
    if (new URLSearchParams(window.location.search).get('e2eDraft') === 'recover') {
      localStorage.setItem('mdview.documentDraft.v1', JSON.stringify({
        id: 'e2e-draft',
        path: null,
        title: 'Untitled.md',
        content: '# Recovered draft\n\nRestored by Playwright.',
        updatedAt: Date.now(),
      }))
    }
    win.__MDVIEW_E2E_STATE__ = state
    win.__MDVIEW_E2E_FILE_ACCESS__ = {
      supportsNativeFiles: true,
      openMarkdownFile: async () => ({
        path: selectedPath,
        content: files[selectedPath],
      }),
      openMarkdownFileAtPath: async (path: string) => {
        const content = files[path]
        if (content === undefined) {
          throw new Error(`Missing test file: ${path}`)
        }

        return { path, content }
      },
      saveMarkdownFile: async (path: string, content: string) => {
        state.savedPath = path
        state.savedContent = content
        files[path] = content
        return path
      },
      saveMarkdownFileAs: async (content: string) => {
        const path = 'C:\\Docs\\Saved As.md'
        state.savedPath = path
        state.savedContent = content
        files[path] = content
        return path
      },
      exportHtmlFile: async () => 'C:\\Docs\\Exported.html',
      printExportHtml: async () => undefined,
      readLocalImageFile: async (path: string) => ({
        path,
        dataUrl: 'data:image/png;base64,',
      }),
      readStartupMarkdownFile: async () => null,
      listenForOpenedFiles: async () => null,
    }
  })

  await page.goto('/')
})

test('starts from a welcome workspace and creates a new document', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Open a Markdown file' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open Markdown File' })).toBeEnabled()
  await expect(page.getByText('No recent files')).toBeVisible()
  await expect(page.getByLabel('View mode')).toHaveCount(0)

  await page.getByRole('button', { name: 'Create new markdown file' }).click()

  await expect(page.getByRole('textbox', { name: 'Markdown source' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit markdown source' })).toHaveClass(/active/)
})

test('opens a markdown file through the file menu', async ({ page }) => {
  await openMarkdownFile(page)

  await expect(page.getByRole('heading', { level: 1, name: 'E2E Opened' })).toBeVisible()
  await expect(page.getByText('E2E Opened.md', { exact: true })).toBeVisible()
})

test('saves edited markdown content', async ({ page }) => {
  await openMarkdownFile(page)
  await page.getByRole('button', { name: 'Edit markdown source' }).click()

  await page
    .getByRole('textbox', { name: 'Markdown source' })
    .fill('# Saved from E2E\n\nUpdated by Playwright.\n')
  await page.getByRole('button', { exact: true, name: 'File' }).click()
  await page.getByRole('menuitem', { exact: true, name: 'Save' }).click()

  await expect(page.locator('.editor-save-state')).toHaveText('Saved')
  await expect
    .poll(() => getSavedContent(page))
    .toContain('# Saved from E2E')
})

test('switches the interface language from the App menu', async ({ page }) => {
  await page.getByRole('button', { name: 'App' }).click()
  await page.getByRole('menuitem', { name: '中文' }).click()

  await expect(page.getByRole('button', { exact: true, name: '文件' })).toBeVisible()

  await page.getByRole('button', { name: '应用' }).click()
  await expect(page.getByText('界面语言')).toBeVisible()
  await expect(page.getByRole('menuitem', { name: '关于' })).toBeVisible()
})

test('opens the About dialog from the App menu', async ({ page }) => {
  await page.getByRole('button', { name: 'App' }).click()
  await page.getByRole('menuitem', { name: 'About' }).click()

  await expect(page.getByRole('dialog', { name: 'About MDView' })).toBeVisible()
  await expect(page.getByText(/^Version [0-9]+\.[0-9]+\.[0-9]+$/)).toBeVisible()
})

test('synchronizes split editor and preview scrolling in both directions', async ({ page }) => {
  await page.getByRole('button', { name: 'Create new markdown file' }).click()
  const editor = page.getByRole('textbox', { name: 'Markdown source' })
  const content = Array.from({ length: 80 }, (_, index) => (
    `## Section ${index + 1}\n\nThis is enough content to create a readable preview block.\n`
  )).join('\n')
  await editor.fill(content)
  await page.getByRole('button', { name: 'Split preview and source' }).click()

  const preview = page.getByLabel('Preview panel')
  await expect(preview.locator('[data-mdview-source-start]').first()).toBeVisible()

  await editor.evaluate((element) => {
    element.scrollTop = element.scrollHeight / 2
    element.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(() => preview.evaluate((element) => element.scrollTop)).toBeGreaterThan(100)

  await editor.evaluate((element) => {
    element.scrollTop = 0
  })
  await preview.evaluate((element) => {
    element.scrollTop = element.scrollHeight / 2
    element.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(() => editor.evaluate((element) => element.scrollTop)).toBeGreaterThan(100)

  await page.getByRole('button', { name: 'Disable synchronized scrolling' }).click()
  const previewTopBeforeDisable = await preview.evaluate((element) => element.scrollTop)
  await editor.evaluate((element) => {
    element.scrollTop = 0
    element.dispatchEvent(new Event('scroll'))
  })
  await page.waitForTimeout(100)
  await expect.poll(() => preview.evaluate((element) => element.scrollTop)).toBe(previewTopBeforeDisable)
})

test('restores a pending unsaved draft', async ({ page }) => {
  await page.goto('/?e2eDraft=recover')

  await expect(page.getByRole('dialog', { name: 'Recover unsaved draft' })).toBeVisible()
  await page.getByRole('button', { name: 'Restore draft' }).click()

  await expect(page.getByRole('textbox', { name: 'Markdown source' })).toHaveValue(
    '# Recovered draft\n\nRestored by Playwright.',
  )
  await expect(page.locator('.editor-save-state')).toHaveText('Unsaved')
})

async function openMarkdownFile(page: Page) {
  await page.getByRole('button', { exact: true, name: 'File' }).click()
  await page.getByRole('menuitem', { name: 'Open Markdown File' }).click()
}

async function getSavedContent(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const win = window as typeof window & {
      __MDVIEW_E2E_STATE__?: {
        savedContent: string | null
      }
    }

    return win.__MDVIEW_E2E_STATE__?.savedContent ?? null
  })
}
