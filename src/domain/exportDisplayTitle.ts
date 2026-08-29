const documentExtensionPattern = /\.(?:md|markdown|txt|doc|docx|pdf|htm|html)$/i

export function createExportDisplayTitle(title: string): string {
  const normalized = title.trim() || 'MDView'
  return normalized.replace(documentExtensionPattern, '') || normalized
}
