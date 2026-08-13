export type MarkdownDocument = {
  title: string
  path: string | null
  content: string
  savedContent: string
  savedRevision: string | null
  isDirty: boolean
}

const untitledContent = '# Untitled\n\nStart writing or open a Markdown file.'

export function createInitialDocument(): MarkdownDocument {
  return {
    title: 'Untitled.md',
    path: null,
    content: untitledContent,
    savedContent: untitledContent,
    savedRevision: null,
    isDirty: false,
  }
}

export function createImportedDocument(content: string, suggestedFilename: string): MarkdownDocument {
  return {
    title: suggestedFilename,
    path: null,
    content,
    savedContent: '',
    savedRevision: null,
    isDirty: true,
  }
}

export function replaceDocumentContent(
  document: MarkdownDocument,
  content: string,
  path: string,
  revision: string | null = null,
): MarkdownDocument {
  return {
    ...document,
    title: getTitleFromPath(path),
    path,
    content,
    savedContent: content,
    savedRevision: revision,
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
  savedContent = document.content,
  savedRevision = document.savedRevision,
): MarkdownDocument {
  return {
    ...document,
    title: getTitleFromPath(path),
    path,
    savedContent,
    savedRevision,
    isDirty: document.content !== savedContent,
  }
}

function getTitleFromPath(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? 'Untitled.md'
}
