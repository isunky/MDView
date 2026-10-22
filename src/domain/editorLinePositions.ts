// Keep source navigation and search markers aligned with the textarea's wrapping.
function createEditorMirror(editor: HTMLTextAreaElement) {
  const style = getComputedStyle(editor)
  const mirror = document.createElement('div')
  for (const property of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'word-spacing', 'tab-size', 'text-indent', 'word-break', 'overflow-wrap', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left']) {
    mirror.style.setProperty(property, style.getPropertyValue(property))
  }
  Object.assign(mirror.style, {
    position: 'fixed', left: '-100000px', top: '0', visibility: 'hidden',
    width: `${editor.clientWidth}px`, boxSizing: 'border-box',
    whiteSpace: editor.wrap === 'off' ? 'pre' : 'pre-wrap', pointerEvents: 'none',
  })
  return mirror
}

export function measureEditorLinePositions(editor: HTMLTextAreaElement): number[] {
  if (!editor.clientWidth) return []
  const mirror = createEditorMirror(editor)
  const lines = editor.value.split(/\r?\n/).map(value => {
    const line = document.createElement('div')
    line.textContent = value || '\u200b'
    mirror.append(line)
    return line
  })
  document.body.append(mirror)
  try {
    const top = mirror.getBoundingClientRect().top
    return lines.map(line => line.getBoundingClientRect().top - top)
  } finally {
    mirror.remove()
  }
}

export function measureEditorRangeRects(editor: HTMLTextAreaElement, start: number, end: number) {
  if (!editor.clientWidth || end <= start) return []
  const mirror = createEditorMirror(editor)
  const text = document.createTextNode(`${editor.value}\u200b`)
  mirror.append(text)
  document.body.append(mirror)
  try {
    const range = document.createRange()
    range.setStart(text, Math.max(0, Math.min(start, editor.value.length)))
    range.setEnd(text, Math.max(0, Math.min(end, editor.value.length)))
    const origin = mirror.getBoundingClientRect()
    return Array.from(range.getClientRects()).map(rect => ({
      left: rect.left - origin.left, top: rect.top - origin.top,
      width: rect.width, height: rect.height,
    })).filter(rect => rect.width > 0)
  } finally {
    mirror.remove()
  }
}
