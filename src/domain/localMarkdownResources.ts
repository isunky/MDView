export type LocalMarkdownResource =
  | { kind: 'image'; path: string }
  | { kind: 'markdown'; path: string; headingId?: string }

const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif'])
const markdownExtensions = new Set(['md', 'markdown'])

export function resolveLocalMarkdownResource(
  href: string | undefined,
  sourcePath: string | null | undefined,
): LocalMarkdownResource | null {
  if (!href || !sourcePath || isExternalHref(href) || href.startsWith('#')) {
    return null
  }

  const { pathPart, fragment } = splitFragment(href)
  const decodedPath = decodePath(pathPart)
  const extension = getExtension(decodedPath)
  const resolvedPath = resolvePath(dirname(sourcePath), decodedPath)

  if (imageExtensions.has(extension)) {
    return { kind: 'image', path: resolvedPath }
  }

  if (markdownExtensions.has(extension)) {
    return {
      kind: 'markdown',
      path: resolvedPath,
      ...(fragment ? { headingId: decodePath(fragment) } : {}),
    }
  }

  return null
}

export function resolveSameDocumentHeading(href: string | undefined): string | null {
  if (!href?.startsWith('#') || href.length === 1) {
    return null
  }

  return decodePath(href.slice(1))
}

function splitFragment(href: string): { pathPart: string; fragment?: string } {
  const fragmentIndex = href.indexOf('#')
  if (fragmentIndex < 0) {
    return { pathPart: href }
  }

  return {
    pathPart: href.slice(0, fragmentIndex),
    fragment: href.slice(fragmentIndex + 1),
  }
}

function dirname(path: string): string {
  const normalizedPath = path.replace(/[\\/]+$/, '')
  const separatorIndex = Math.max(normalizedPath.lastIndexOf('/'), normalizedPath.lastIndexOf('\\'))
  return separatorIndex >= 0 ? normalizedPath.slice(0, separatorIndex) : ''
}

function resolvePath(baseDirectory: string, targetPath: string): string {
  const separator = baseDirectory.includes('\\') || targetPath.includes('\\') ? '\\' : '/'
  const normalizedTarget = targetPath.replace(/[\\/]+/g, separator)

  if (isAbsolutePath(normalizedTarget)) {
    return normalizePath(normalizedTarget, separator)
  }

  return normalizePath(`${baseDirectory}${separator}${normalizedTarget}`, separator)
}

function normalizePath(path: string, separator: string): string {
  const normalizedPath = path.replace(/[\\/]+/g, separator)
  const prefix = getPathPrefix(normalizedPath, separator)
  const body = prefix ? normalizedPath.slice(prefix.length) : normalizedPath
  const segments: string[] = []

  for (const segment of body.split(separator)) {
    if (!segment || segment === '.') {
      continue
    }

    if (segment === '..') {
      if (segments.length > 0) {
        segments.pop()
      }
      continue
    }

    segments.push(segment)
  }

  return `${prefix}${segments.join(separator)}`
}

function getPathPrefix(path: string, separator: string): string {
  if (/^[a-zA-Z]:[\\/]/.test(path)) {
    return path.slice(0, 3).replace(/[\\/]/g, separator)
  }

  if (path.startsWith('\\\\') || path.startsWith('//')) {
    return separator.repeat(2)
  }

  return path.startsWith(separator) ? separator : ''
}

function isAbsolutePath(path: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(path) || path.startsWith('/') || path.startsWith('\\\\')
}

function isExternalHref(href: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href) && !href.startsWith('file:')
}

function getExtension(path: string): string {
  const filename = path.split(/[\\/]/).at(-1) ?? path
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex > 0 ? filename.slice(dotIndex + 1).toLowerCase() : ''
}

function decodePath(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
