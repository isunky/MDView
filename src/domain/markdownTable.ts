export type MarkdownTableLabels = {
  header: (column: number) => string
  cell: string
}

export function createMarkdownTable(
  columns: number,
  rows: number,
  labels: MarkdownTableLabels,
): string {
  const safeColumns = clampDimension(columns)
  const safeRows = clampDimension(rows)
  const header = Array.from({ length: safeColumns }, (_, index) => labels.header(index + 1))
  const separator = Array.from({ length: safeColumns }, () => '---')
  const body = Array.from({ length: Math.max(0, safeRows - 1) }, () =>
    Array.from({ length: safeColumns }, () => labels.cell),
  )

  return [header, separator, ...body].map(formatRow).join('\n')
}

function clampDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.min(6, Math.max(1, Math.trunc(value)))
}

function formatRow(cells: string[]): string {
  return `| ${cells.join(' | ')} |`
}
