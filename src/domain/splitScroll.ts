export type ScrollMetrics = {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

export type SplitScrollAnchor = {
  sourceLine: number
  previewTop: number
}

declare const normalizedSplitScrollAnchorsBrand: unique symbol
export type NormalizedSplitScrollAnchors = readonly SplitScrollAnchor[] & {
  readonly [normalizedSplitScrollAnchorsBrand]: true
}
export const EMPTY_NORMALIZED_SPLIT_SCROLL_ANCHORS =
  Object.freeze([]) as unknown as NormalizedSplitScrollAnchors

const SOURCE_VIEWPORT_OFFSET = 32

export function getScrollMaximum(metrics: ScrollMetrics): number {
  return Math.max(0, metrics.scrollHeight - metrics.clientHeight)
}

export function normalizeSplitScrollAnchors(
  anchors: SplitScrollAnchor[],
  lineCount: number,
  previewMaximum: number,
): NormalizedSplitScrollAnchors {
  const maximumLine = Math.max(1, lineCount)
  const normalized = anchors
    .filter((anchor) => Number.isFinite(anchor.sourceLine) && Number.isFinite(anchor.previewTop))
    .map((anchor) => ({
      sourceLine: clamp(anchor.sourceLine, 1, maximumLine),
      previewTop: clamp(anchor.previewTop, 0, previewMaximum),
    }))
    .sort((left, right) => left.sourceLine - right.sourceLine || left.previewTop - right.previewTop)

  const unique: SplitScrollAnchor[] = []
  for (const anchor of normalized) {
    const previous = unique.at(-1)
    if (previous?.sourceLine === anchor.sourceLine) {
      previous.previewTop = Math.min(previous.previewTop, anchor.previewTop)
      continue
    }

    unique.push({
      sourceLine: anchor.sourceLine,
      previewTop: previous ? Math.max(previous.previewTop, anchor.previewTop) : anchor.previewTop,
    })
  }

  return mergeEndpoint(
    mergeEndpoint(unique, { sourceLine: 1, previewTop: 0 }, true),
    { sourceLine: maximumLine, previewTop: previewMaximum },
    false,
  ).sort((left, right) => left.sourceLine - right.sourceLine) as unknown as NormalizedSplitScrollAnchors
}

export function mapEditorScrollToPreview(
  editor: ScrollMetrics,
  preview: ScrollMetrics,
  lineCount: number,
  lineHeight: number,
  paddingTop: number,
  anchors: NormalizedSplitScrollAnchors,
  editorLineTops: number[] = [],
): number {
  const previewMaximum = getScrollMaximum(preview)
  const editorMaximum = getScrollMaximum(editor)
  if (editorMaximum === 0 || previewMaximum === 0) {
    return editor.scrollTop <= 0 ? 0 : previewMaximum
  }

  if (editor.scrollTop <= 0) {
    return 0
  }
  if (editor.scrollTop >= editorMaximum - 1) {
    return previewMaximum
  }

  const sourceLine = editorLineTops.length > 1
    ? sourceLineAtTop(editorLineTops, editor.scrollTop)
    : 1 + Math.max(0, editor.scrollTop + SOURCE_VIEWPORT_OFFSET - paddingTop) / Math.max(1, lineHeight)
  return mapSourceLineToPreview(clamp(sourceLine, 1, Math.max(1, lineCount)), anchors)
}

export function mapPreviewScrollToEditor(
  preview: ScrollMetrics,
  editor: ScrollMetrics,
  lineCount: number,
  lineHeight: number,
  paddingTop: number,
  anchors: NormalizedSplitScrollAnchors,
  editorLineTops: number[] = [],
): number {
  const previewMaximum = getScrollMaximum(preview)
  const editorMaximum = getScrollMaximum(editor)
  if (previewMaximum === 0 || editorMaximum === 0) {
    return preview.scrollTop <= 0 ? 0 : editorMaximum
  }

  if (preview.scrollTop <= 0) {
    return 0
  }
  if (preview.scrollTop >= previewMaximum - 1) {
    return editorMaximum
  }

  const sourceLine = clamp(
    mapPreviewTopToSourceLine(clamp(preview.scrollTop, 0, previewMaximum), anchors),
    1,
    Math.max(1, lineCount),
  )
  if (editorLineTops.length > 1) {
    const index = Math.min(editorLineTops.length - 1, Math.max(0, Math.floor(sourceLine - 1)))
    const top = editorLineTops[index]
    const next = editorLineTops[index + 1] ?? top
    return clamp(top + (sourceLine - 1 - index) * (next - top), 0, editorMaximum)
  }
  return clamp(
    paddingTop + (sourceLine - 1) * Math.max(1, lineHeight) - SOURCE_VIEWPORT_OFFSET,
    0,
    editorMaximum,
  )
}

function sourceLineAtTop(tops: number[], top: number): number {
  let low = 0
  let high = tops.length - 1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (tops[mid] <= top) low = mid
    else high = mid - 1
  }
  const next = tops[low + 1]
  return low + 1 + (next === undefined ? 0 : clamp((top - tops[low]) / Math.max(1, next - tops[low]), 0, 1))
}

function mapSourceLineToPreview(
  sourceLine: number,
  anchors: NormalizedSplitScrollAnchors,
): number {
  const [before, after] = findSourceRange(anchors, sourceLine)
  return interpolate(sourceLine, before.sourceLine, after.sourceLine, before.previewTop, after.previewTop)
}

function mapPreviewTopToSourceLine(
  previewTop: number,
  anchors: NormalizedSplitScrollAnchors,
): number {
  const [before, after] = findPreviewRange(anchors, previewTop)
  return interpolate(previewTop, before.previewTop, after.previewTop, before.sourceLine, after.sourceLine)
}

function findSourceRange(anchors: readonly SplitScrollAnchor[], sourceLine: number): [SplitScrollAnchor, SplitScrollAnchor] {
  let low = 1
  let high = anchors.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (sourceLine <= anchors[middle].sourceLine) high = middle
    else low = middle + 1
  }

  const last = anchors.at(-1) ?? { sourceLine: 1, previewTop: 0 }
  if (low >= anchors.length) return [last, last]
  return [anchors[low - 1] ?? last, anchors[low] ?? last]
}

function findPreviewRange(anchors: readonly SplitScrollAnchor[], previewTop: number): [SplitScrollAnchor, SplitScrollAnchor] {
  let low = 1
  let high = anchors.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (previewTop <= anchors[middle].previewTop) high = middle
    else low = middle + 1
  }

  const last = anchors.at(-1) ?? { sourceLine: 1, previewTop: 0 }
  if (low >= anchors.length) return [last, last]
  return [anchors[low - 1] ?? last, anchors[low] ?? last]
}

function mergeEndpoint(
  anchors: SplitScrollAnchor[],
  endpoint: SplitScrollAnchor,
  isStart: boolean,
): SplitScrollAnchor[] {
  const existingIndex = anchors.findIndex((anchor) => anchor.sourceLine === endpoint.sourceLine)
  if (existingIndex >= 0) {
    anchors[existingIndex] = endpoint
    return anchors
  }

  return isStart ? [endpoint, ...anchors] : [...anchors, endpoint]
}

function interpolate(value: number, start: number, end: number, startResult: number, endResult: number): number {
  if (end <= start) {
    return startResult
  }

  return startResult + ((value - start) / (end - start)) * (endResult - startResult)
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
