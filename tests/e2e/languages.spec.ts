import { expect, test } from '@playwright/test'

const languages = [
  {
    id: 'ja', systemLocale: 'ja-JP', name: '日本語', app: 'アプリ', file: 'ファイル', reading: '閲覧',
    welcome: 'Markdown ファイルを開く', create: 'Markdown ファイルを新規作成', source: 'Markdown ソース',
    syntax: 'Markdown 書式ガイド', basic: '基本の書式', closeSyntax: 'Markdown 書式ガイドを閉じる',
    settings: '表示設定', closeSettings: '表示設定を閉じる',
  },
  {
    id: 'ko', systemLocale: 'ko-KR', name: '한국어', app: '앱', file: '파일', reading: '읽기',
    welcome: 'Markdown 파일 열기', create: '새 Markdown 파일 만들기', source: 'Markdown 소스',
    syntax: 'Markdown 문법 안내', basic: '기본 서식', closeSyntax: 'Markdown 문법 안내 닫기',
    settings: '읽기 설정', closeSettings: '읽기 설정 닫기',
  },
  {
    id: 'es', systemLocale: 'es-MX', name: 'Español', app: 'Aplicación', file: 'Archivo', reading: 'Lectura',
    welcome: 'Abrir un archivo Markdown', create: 'Crear archivo Markdown', source: 'Código Markdown',
    syntax: 'Guía de sintaxis Markdown', basic: 'Formato básico', closeSyntax: 'Cerrar guía de sintaxis Markdown',
    settings: 'Ajustes de lectura', closeSettings: 'Cerrar ajustes de lectura',
  },
]

for (const language of languages) {
  test.describe(`${language.name} interface`, () => {
    test.use({ locale: language.systemLocale, viewport: { width: 1280, height: 800 } })

    test('detects the system language, remembers overrides, and localizes editor help and reading settings', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto('/')
      await expect(page.getByRole('heading', { name: language.welcome, exact: true })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', language.id)
      await page.getByRole('button', { name: language.app, exact: true }).click()
      for (const name of ['English', '中文', '日本語', '한국어', 'Español']) {
        await expect(page.getByRole('menuitem', { name, exact: true })).toBeVisible()
      }

      await page.getByRole('menuitem', { name: 'English', exact: true }).click()
      await expect(page.getByRole('button', { name: 'App', exact: true })).toBeVisible()
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Open a Markdown file', exact: true })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await page.getByRole('button', { name: 'App', exact: true }).click()
      await page.getByRole('menuitem', { name: language.name, exact: true }).click()
      await expect(page.getByRole('button', { name: language.file, exact: true })).toBeVisible()

      await page.getByRole('button', { name: language.app, exact: true }).click()
      await expect(page.getByRole('menuitem', { name: language.name, exact: true })).toHaveAttribute('aria-current', 'true')
      await page.screenshot({ path: `output/playwright/language-${language.id}-menu.png` })
      await page.getByRole('button', { name: language.app, exact: true }).click()
      await page.getByRole('button', { name: language.create, exact: true }).click()
      await page.getByRole('textbox', { name: language.source, exact: true }).fill('# Sample\n\n**MDView**')
      await page.getByRole('button', { name: language.syntax, exact: true }).click()
      await expect(page.getByRole('dialog', { name: language.syntax })).toBeVisible()
      await expect(page.getByRole('tab', { name: language.basic, exact: true })).toBeVisible()
      await page.screenshot({ path: `output/playwright/language-${language.id}-syntax.png` })
      await page.getByRole('button', { name: language.closeSyntax, exact: true }).click()

      await page.setViewportSize({ width: 390, height: 844 })
      const menuRight = await page.locator('.toolbar > .action-menu > button').evaluateAll((buttons) => (
        Math.max(...buttons.map((button) => button.getBoundingClientRect().right))
      ))
      const modesLeft = await page.locator('.view-controls').evaluate((element) => element.getBoundingClientRect().left)
      expect(menuRight).toBeLessThanOrEqual(modesLeft)
      await page.screenshot({ path: `output/playwright/language-${language.id}-editor-mobile.png` })
      await page.getByRole('button', { name: language.reading, exact: true }).click()
      await page.getByRole('menuitem', { name: language.settings, exact: true }).click()
      const settings = page.getByRole('dialog', { name: language.settings })
      await expect(settings).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      expect(await settings.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
      await page.screenshot({ path: `output/playwright/language-${language.id}-settings-mobile.png` })
      await page.getByRole('button', { name: language.closeSettings, exact: true }).click()
      expect(errors).toEqual([])
    })
  })
}
