export type ShortcutPlatform = 'windows' | 'macos'

export type ShortcutDefinition = {
  key: string
  shiftKey?: boolean
}

type ShortcutKeyboardEvent = {
  altKey?: boolean
  code?: string
  ctrlKey?: boolean
  isComposing?: boolean
  key: string
  metaKey?: boolean
  shiftKey?: boolean
}

export function detectShortcutPlatform(): ShortcutPlatform {
  if (typeof navigator === 'undefined') {
    return 'windows'
  }

  return /mac|iphone|ipad|ipod/i.test(navigator.platform) ? 'macos' : 'windows'
}

export function matchesShortcut(
  event: ShortcutKeyboardEvent,
  shortcut: ShortcutDefinition,
  platform: ShortcutPlatform = detectShortcutPlatform(),
): boolean {
  if (event.isComposing || event.altKey) {
    return false
  }

  if (!matchesShortcutKey(event, shortcut.key)) {
    return false
  }

  if (Boolean(event.shiftKey) !== Boolean(shortcut.shiftKey)) {
    return false
  }

  if (platform === 'macos') {
    return Boolean(event.metaKey) && !event.ctrlKey
  }

  return Boolean(event.ctrlKey) && !event.metaKey
}

export function formatShortcut(
  shortcut: ShortcutDefinition,
  platform: ShortcutPlatform = detectShortcutPlatform(),
): string {
  return [
    platform === 'macos' ? 'Command' : 'Ctrl',
    shortcut.shiftKey ? 'Shift' : null,
    formatShortcutKey(shortcut.key),
  ]
    .filter(Boolean)
    .join('+')
}

export function withShortcutTitle(
  label: string,
  shortcut: ShortcutDefinition,
  platform: ShortcutPlatform = detectShortcutPlatform(),
): string {
  return `${label} (${formatShortcut(shortcut, platform)})`
}

function matchesShortcutKey(event: ShortcutKeyboardEvent, key: string): boolean {
  const normalizedKey = key.toLowerCase()
  const eventKey = event.key.toLowerCase()

  if (eventKey === normalizedKey) {
    return true
  }

  if (!event.code) {
    return false
  }

  if (/^[a-z]$/.test(normalizedKey)) {
    return event.code === `Key${normalizedKey.toUpperCase()}`
  }

  if (/^\d$/.test(normalizedKey)) {
    return event.code === `Digit${normalizedKey}`
  }

  return false
}

function formatShortcutKey(key: string): string {
  return key.length === 1 ? key.toUpperCase() : key
}
