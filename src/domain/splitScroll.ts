export type ScrollMetrics = {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

export type SplitScrollAnchor = {
  sourceLine: number
  previewTop: number
}

const SOURCE_VIEWPORT_OFFSET = 32

export function getScrollMaximum(metrics: ScrollMetrics): number {
  return Math.max(0, metrics.scrollHeight - metrics.clientHeight)
}

export function normalizeSplitScrollAnchors(
  anchors: SplitScrollAnchor[],
  lineCount: number,
  previewMaximum: number,
): SplitScrollAnchor[] {
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
  ).sort((left, right) => left.sourceLine - right.sourceLine)
}

export function mapEditorScrollToPreview(
  editor: ScrollMetrics,
  preview: ScrollMetrics,
  lineCount: number,
  lineHeight: number,
  paddingTop: number,
  anchors: SplitScrollAnchor[],
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

  const sourceLine = 1 + Math.max(0, editor.scrollTop + SOURCE_VIEWPORT_OFFSET - paddingTop) /
    Math.max(1, lineHeight)
  return mapSourceLineToPreview(sourceLine, lineCount, previewMaximum, anchors)
}

export function mapPreviewScrollToEditor(
  preview: ScrollMetrics,
  editor: ScrollMetrics,
  lineCount: number,
  lineHeight: number,
  paddingTop: number,
  anchors: SplitScrollAnchor[],
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

  const sourceLine = mapPreviewTopToSourceLine(preview.scrollTop, lineCount, previewMaximum, anchors)
  return clamp(
    paddingTop + (sourceLine - 1) * Math.max(1, lineHeight) - SOURCE_VIEWPORT_OFFSET,
    0,
    editorMaximum,
  )
}

function mapSourceLineToPreview(
  sourceLine: number,
  lineCount: number,
  previewMaximum: number,
  anchors: SplitScrollAnchor[],
): number {
  const normalized = normalizeSplitScrollAnchors(anchors, lineCount, previewMaximum)
  const [before, after] = findSourceRange(normalized, sourceLine)
  return interpolate(sourceLine, before.sourceLine, after.sourceLine, before.previewTop, after.previewTop)
}

function mapPreviewTopToSourceLine(
  previewTop: number,
  lineCount: number,
  previewMaximum: number,
  anchors: SplitScrollAnchor[],
): number {
  const normalized = normalizeSplitScrollAnchors(anchors, lineCount, previewMaximum)
  const [before, after] = findPreviewRange(normalized, previewTop)
  return interpolate(previewTop, before.previewTop, after.previewTop, before.sourceLine, after.sourceLine)
}

function findSourceRange(anchors: SplitScrollAnchor[], sourceLine: number): [SplitScrollAnchor, SplitScrollAnchor] {
  for (let index = 1; index < anchors.length; index += 1) {
    if (sourceLine <= anchors[index].sourceLine) {
      return [anchors[index - 1], anchors[index]]
    }
  }

  const last = anchors.at(-1) ?? { sourceLine: 1, previewTop: 0 }
  return [last, last]
}

function findPreviewRange(anchors: SplitScrollAnchor[], previewTop: number): [SplitScrollAnchor, SplitScrollAnchor] {
  for (let index = 1; index < anchors.length; index += 1) {
    if (previewTop <= anchors[index].previewTop) {
      return [anchors[index - 1], anchors[index]]
    }
  }

  const last = anchors.at(-1) ?? { sourceLine: 1, previewTop: 0 }
  return [last, last]
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
