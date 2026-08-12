export type MarkdownPreviewLabels = {
  copyCode: string
  copiedCode: string
  plainCodeBlock: string
  codeBlock: (language: string) => string
  mermaidDiagram: string
  mermaidLoading: string
  mermaidError: string
  imagePreview: string
  closeImagePreview: string
  imagePreviewAlt: (alt: string) => string
}
