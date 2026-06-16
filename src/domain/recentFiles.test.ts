import { describe, expect, it } from 'vitest'
import { addRecentFile, MAX_RECENT_FILES, removeRecentFile, type RecentFile } from './recentFiles'

describe('recent files', () => {
  it('moves duplicate paths to the top without duplicating entries', () => {
    const existing: RecentFile[] = [
      recent('/tmp/first.md', '2026-01-01T00:00:00.000Z'),
      recent('/tmp/second.md', '2026-01-02T00:00:00.000Z'),
    ]

    const next = addRecentFile(existing, '/tmp/first.md', new Date('2026-01-03T00:00:00.000Z'))

    expect(next).toHaveLength(2)
    expect(next.map((file) => file.path)).toEqual(['/tmp/first.md', '/tmp/second.md'])
    expect(next[0].lastOpenedAt).toBe('2026-01-03T00:00:00.000Z')
  })

  it('keeps only the most recent ten files', () => {
    const existing = Array.from({ length: MAX_RECENT_FILES }, (_, index) =>
      recent(`/tmp/file-${index}.md`, `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`),
    )

    const next = addRecentFile(existing, '/tmp/latest.md', new Date('2026-02-01T00:00:00.000Z'))

    expect(next).toHaveLength(MAX_RECENT_FILES)
    expect(next[0].path).toBe('/tmp/latest.md')
    expect(next.some((file) => file.path === '/tmp/file-0.md')).toBe(false)
  })

  it('removes a file by path', () => {
    const next = removeRecentFile(
      [recent('/tmp/keep.md', '2026-01-01T00:00:00.000Z'), recent('/tmp/remove.md', '2026-01-02T00:00:00.000Z')],
      '/tmp/remove.md',
    )

    expect(next.map((file) => file.path)).toEqual(['/tmp/keep.md'])
  })
})

function recent(path: string, lastOpenedAt: string): RecentFile {
  return {
    path,
    title: path.split('/').at(-1) ?? path,
    lastOpenedAt,
  }
}
