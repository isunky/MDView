import { describe, expect, it } from 'vitest'
import { matchesShortcut, type ShortcutPlatform } from './keyboardShortcuts'

function keyboardEvent(
  overrides: Partial<KeyboardEvent> & { key: string },
): KeyboardEvent {
  const { key, ...eventOverrides } = overrides

  return {
    altKey: false,
    ctrlKey: false,
    isComposing: false,
    key,
    metaKey: false,
    shiftKey: false,
    ...eventOverrides,
  } as KeyboardEvent
}

describe('keyboardShortcuts', () => {
  it('matches Ctrl shortcuts on Windows and rejects Command', () => {
    const platform: ShortcutPlatform = 'windows'

    expect(matchesShortcut(keyboardEvent({ key: 's', ctrlKey: true }), { key: 's' }, platform)).toBe(true)
    expect(matchesShortcut(keyboardEvent({ key: 's', metaKey: true }), { key: 's' }, platform)).toBe(false)
  })

  it('matches Command shortcuts on macOS and rejects Ctrl', () => {
    const platform: ShortcutPlatform = 'macos'

    expect(matchesShortcut(keyboardEvent({ key: 's', metaKey: true }), { key: 's' }, platform)).toBe(true)
    expect(matchesShortcut(keyboardEvent({ key: 's', ctrlKey: true }), { key: 's' }, platform)).toBe(false)
  })

  it('distinguishes save from save-as shortcuts and ignores composing input', () => {
    expect(
      matchesShortcut(keyboardEvent({ key: 's', ctrlKey: true }), { key: 's', shiftKey: true }, 'windows'),
    ).toBe(false)
    expect(
      matchesShortcut(
        keyboardEvent({ key: 's', ctrlKey: true, shiftKey: true }),
        { key: 's', shiftKey: true },
        'windows',
      ),
    ).toBe(true)
    expect(
      matchesShortcut(
        keyboardEvent({ key: 's', ctrlKey: true, isComposing: true }),
        { key: 's' },
        'windows',
      ),
    ).toBe(false)
  })
})
