import { afterEach, describe, expect, it, vi } from 'vitest'
import { printHtmlInBrowser } from './printHtml'

describe('browser HTML printing', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.querySelectorAll('.mdview-print-root, .mdview-print-styles').forEach((element) => element.remove())
  })

  it('prints from the current window with the exported content and styles', async () => {
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => undefined)
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })

    await printHtmlInBrowser(
      '<!doctype html><html><head><style>.markdown-preview{color:red}</style></head><body><article class="markdown-preview">Ready</article></body></html>',
      'Ready',
    )

    expect(document.querySelector('.mdview-print-root')?.textContent).toBe('Ready')
    expect(document.querySelector('.mdview-print-styles')?.textContent).toContain('.markdown-preview{color:red}')
    expect(document.querySelector('.mdview-print-styles')?.textContent).toContain('content: "Ready"')
    expect(document.querySelector('.mdview-print-styles')?.textContent).toContain('content: counter(page)')
    expect(focus).toHaveBeenCalledOnce()
    expect(print).toHaveBeenCalledOnce()

    window.dispatchEvent(new Event('afterprint'))
    expect(document.querySelector('.mdview-print-root')).toBeNull()
    expect(document.querySelector('.mdview-print-styles')).toBeNull()
  })

  it('replaces an unfinished print layer before starting another print', async () => {
    vi.spyOn(window, 'focus').mockImplementation(() => undefined)
    vi.spyOn(window, 'print').mockImplementation(() => undefined)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })

    await printHtmlInBrowser('<body><article>First</article></body>', 'First')
    await printHtmlInBrowser('<body><article>Second</article></body>', 'Second')

    expect(document.querySelectorAll('.mdview-print-root')).toHaveLength(1)
    expect(document.querySelector('.mdview-print-root')?.textContent).toBe('Second')
  })
})
