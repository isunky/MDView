const IMPORTED_PAGE_KEY = 'mdviewImportedPage'
const WORKSPACE_PATH = 'index.html'

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'open-in-mdview',
    title: 'Open current page in MDView',
    contexts: ['page'],
  })
})

chrome.action.onClicked.addListener((tab) => {
  void openTabInMdView(tab)
})

chrome.contextMenus.onClicked.addListener((_info, tab) => {
  if (tab) void openTabInMdView(tab)
})

async function openTabInMdView(tab: { id?: number; url?: string }) {
  if (!tab.id) {
    await openWorkspace()
    return
  }

  try {
    if (tab.url?.startsWith('file:')) {
      await chrome.permissions.request({ origins: ['file:///*'] })
    }
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageMarkdown,
    })
    const imported = result?.result
    if (!isImportedPage(imported)) {
      await openWorkspace()
      return
    }

    await chrome.storage.session.set({
      [IMPORTED_PAGE_KEY]: {
        id: crypto.randomUUID(),
        title: imported.title,
        content: imported.content,
      },
    })
  } catch {
    // Browser-protected pages and pages without activeTab access open the workspace instead.
  }

  await openWorkspace()
}

async function openWorkspace() {
  await chrome.tabs.create({ url: chrome.runtime.getURL(WORKSPACE_PATH) })
}

function extractPageMarkdown() {
  const title = document.title || 'webpage.md'
  const pre = document.body.children.length === 1 && document.body.firstElementChild?.tagName === 'PRE'
  const content = pre ? document.body.textContent ?? '' : document.body.innerText
  return { title: title.endsWith('.md') ? title : `${title}.md`, content }
}

function isImportedPage(value: unknown): value is { title: string; content: string } {
  return Boolean(value) && typeof value === 'object' &&
    typeof (value as Record<string, unknown>).title === 'string' &&
    typeof (value as Record<string, unknown>).content === 'string'
}
