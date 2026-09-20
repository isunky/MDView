// Mirror textarea typography and wrapping once per layout/content change.
export function measureEditorLinePositions(editor: HTMLTextAreaElement): number[] {
  if (!editor.clientWidth) return []
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
