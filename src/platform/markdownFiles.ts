const markdownExtensions = new Set(['md', 'markdown', 'mdown', 'mkdn'])

export function isMarkdownPath(path: string): boolean {
  const extension = path.split('.').at(-1)?.toLowerCase()
  return extension !== undefined && extension !== path.toLowerCase() && markdownExtensions.has(extension)
}

export function ensureMarkdownExtension(path: string): string {
  return isMarkdownPath(path) ? path : `${path}.md`
}
