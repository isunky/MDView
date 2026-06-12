export type MarkdownDocument = {
  title: string
  path: string | null
  content: string
  savedContent: string
  isDirty: boolean
}

const untitledContent = '# Untitled\n\nStart writing or open a Markdown file.'

export function createInitialDocument(): MarkdownDocument {
  return {
    title: 'Untitled.md',
    path: null,
    content: untitledContent,
    savedContent: untitledContent,
    isDirty: false,
  }
}

export function replaceDocumentContent(
  document: MarkdownDocument,
  content: string,
  path: string,
): MarkdownDocument {
  return {
    ...document,
    title: getTitleFromPath(path),
    path,
    content,
    savedContent: content,
    isDirty: false,
  }
}

export function updateDocumentDraft(
  document: MarkdownDocument,
  content: string,
): MarkdownDocument {
  return {
    ...document,
    content,
    isDirty: content !== document.savedContent,
  }
}

export function markDocumentSaved(
  document: MarkdownDocument,
  path: string,
): MarkdownDocument {
  return {
    ...document,
    title: getTitleFromPath(path),
    path,
    savedContent: document.content,
    isDirty: false,
  }
}

function getTitleFromPath(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? 'Untitled.md'
}
