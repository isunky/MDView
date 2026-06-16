type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  label: string
}

export function MarkdownEditor({ value, onChange, label }: MarkdownEditorProps) {
  return (
    <textarea
      className="markdown-editor"
      aria-label={label}
      spellCheck={false}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  )
}
