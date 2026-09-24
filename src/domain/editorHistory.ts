export type EditorSelection = {
  start: number
  end: number
}

export type EditorSnapshot = {
  value: string
  selection: EditorSelection
}

export type EditorChangeKind = 'typing' | 'command' | 'external'

export type EditorHistory = {
  past: EditorSnapshot[]
  present: EditorSnapshot
  future: EditorSnapshot[]
  lastChangeAt: number
  lastChangeKind: EditorChangeKind | null
}

const MAX_HISTORY_ENTRIES = 100
export const MAX_EDITOR_HISTORY_BYTES = 32 * 1024 * 1024
const SNAPSHOT_OVERHEAD_BYTES = 128
const TYPING_MERGE_WINDOW_MS = 700

export function createEditorHistory(value: string, selection: EditorSelection = { start: 0, end: 0 }): EditorHistory {
  return {
    past: [],
    present: { value, selection },
    future: [],
    lastChangeAt: 0,
    lastChangeKind: null,
  }
}

export function recordEditorChange(
  history: EditorHistory,
  next: EditorSnapshot,
  kind: EditorChangeKind,
  timestamp = Date.now(),
): EditorHistory {
  if (next.value === history.present.value) {
    return {
      ...history,
      present: next,
    }
  }

  const mergeTyping = kind === 'typing'
    && history.lastChangeKind === 'typing'
    && timestamp - history.lastChangeAt <= TYPING_MERGE_WINDOW_MS

  return limitHistory({
    past: mergeTyping
      ? history.past
      : [...history.past, history.present],
    present: next,
    future: [],
    lastChangeAt: timestamp,
    lastChangeKind: kind,
  })
}

export function updateEditorHistorySelection(
  history: EditorHistory,
  selection: EditorSelection,
): EditorHistory {
  return {
    ...history,
    present: {
      ...history.present,
      selection,
    },
  }
}

export function undoEditorChange(history: EditorHistory): EditorHistory {
  const previous = history.past.at(-1)
  if (!previous) {
    return history
  }

  return limitHistory({
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    lastChangeAt: 0,
    lastChangeKind: null,
  }, 'future')
}

export function redoEditorChange(history: EditorHistory): EditorHistory {
  const next = history.future[0]
  if (!next) {
    return history
  }

  return limitHistory({
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
    lastChangeAt: 0,
    lastChangeKind: null,
  })
}

function estimateSnapshotBytes(snapshot: EditorSnapshot): number {
  // UTF-16 estimate plus metadata; reading string.length does not scan the text.
  return snapshot.value.length * 2 + SNAPSHOT_OVERHEAD_BYTES
}

function limitHistory(history: EditorHistory, preserve: 'past' | 'future' = 'past'): EditorHistory {
  let pastStart = 0
  let futureEnd = history.future.length
  let count = history.past.length + futureEnd
  let bytes = estimateSnapshotBytes(history.present)
  for (const snapshot of history.past) bytes += estimateSnapshotBytes(snapshot)
  for (const snapshot of history.future) bytes += estimateSnapshotBytes(snapshot)

  // The current document is never discarded, even if it alone exceeds the budget.
  while (count > 0 && (count > MAX_HISTORY_ENTRIES || bytes > MAX_EDITOR_HISTORY_BYTES)) {
    if (pastStart < history.past.length && (preserve === 'future' || futureEnd === 0)) {
      bytes -= estimateSnapshotBytes(history.past[pastStart++])
    } else {
      bytes -= estimateSnapshotBytes(history.future[--futureEnd])
    }
    count -= 1
  }

  return {
    ...history,
    past: pastStart === 0 ? history.past : history.past.slice(pastStart),
    future: futureEnd === history.future.length ? history.future : history.future.slice(0, futureEnd),
  }
}
