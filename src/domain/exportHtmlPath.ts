export function createExportHtmlDefaultPath(currentPath: string | null, title: string): string {
  if (currentPath) {
    return replacePathExtension(currentPath, 'html')
  }

  return createExportHtmlFilename(title)
}

export function createExportHtmlFilename(title: string): string {
  const sourceName = title.trim() || 'Untitled'
  const stem = stripExtension(sourceName)
  const safeStem = sanitizeFileStem(stem) || 'Untitled'
  return `${safeStem}.html`
}

function replacePathExtension(path: string, extension: string): string {
  const trimmedPath = path.replace(/[\\/]+$/, '')
  const separatorIndex = Math.max(trimmedPath.lastIndexOf('/'), trimmedPath.lastIndexOf('\\'))
  const directory = separatorIndex >= 0 ? trimmedPath.slice(0, separatorIndex + 1) : ''
  const filename = separatorIndex >= 0 ? trimmedPath.slice(separatorIndex + 1) : trimmedPath
  const stem = stripExtension(filename) || 'Untitled'

  return `${directory}${stem}.${extension}`
}

function stripExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex > 0 ? filename.slice(0, dotIndex) : filename
}

function sanitizeFileStem(stem: string): string {
  return Array.from(stem, (character) => (character.charCodeAt(0) < 32 ? '-' : character))
    .join('')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[ .-]+$/g, '')
    .trim()
}
