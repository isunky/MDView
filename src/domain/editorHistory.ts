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

  return {
    past: mergeTyping
      ? history.past
      : [...history.past, history.present].slice(-MAX_HISTORY_ENTRIES),
    present: next,
    future: [],
    lastChangeAt: timestamp,
    lastChangeKind: kind,
  }
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

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future].slice(0, MAX_HISTORY_ENTRIES),
    lastChangeAt: 0,
    lastChangeKind: null,
  }
}

export function redoEditorChange(history: EditorHistory): EditorHistory {
  const next = history.future[0]
  if (!next) {
    return history
  }

  return {
    past: [...history.past, history.present].slice(-MAX_HISTORY_ENTRIES),
    present: next,
    future: history.future.slice(1),
    lastChangeAt: 0,
    lastChangeKind: null,
  }
}
