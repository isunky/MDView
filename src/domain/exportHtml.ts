export type ExportHtmlLanguage = 'en' | 'zh-CN'

type BuildExportHtmlOptions = {
  title: string
  lang: ExportHtmlLanguage
  contentHtml: string
}

const exportStyles = `
:root {
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 40px 24px 72px;
  color: #26323f;
  background: #f8fafb;
  font: 16px/1.72 'Segoe UI Variable Text', 'Segoe UI', 'Microsoft YaHei UI', 'PingFang SC', 'Hiragino Sans GB', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.markdown-preview {
  width: min(900px, 100%);
  margin: 0 auto;
}

.markdown-preview > :first-child {
  margin-top: 0;
}

.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3 {
  color: #111827;
  line-height: 1.25;
}

.markdown-preview h1 {
  margin: 0 0 24px;
  padding-bottom: 14px;
  border-bottom: 1px solid #d9e0e5;
  font-size: 34px;
  font-weight: 760;
}

.markdown-preview h2 {
  margin: 34px 0 12px;
  font-size: 24px;
  font-weight: 720;
}

.markdown-preview h3 {
  margin: 28px 0 10px;
  font-size: 19px;
}

.markdown-preview p,
.markdown-preview ul,
.markdown-preview ol,
.markdown-preview blockquote,
.markdown-preview table,
.markdown-preview pre {
  margin: 0 0 18px;
}

.markdown-preview a {
  color: #1d4ed8;
  text-underline-offset: 3px;
}

.markdown-preview blockquote {
  padding: 10px 18px;
  border-left: 3px solid #0f766e;
  color: #667085;
  background: #edf7f6;
}

.markdown-preview table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border: 1px solid #d9e0e5;
  border-radius: 8px;
  font-size: 14px;
}

.markdown-preview th,
.markdown-preview td {
  padding: 10px 12px;
  border: 1px solid #d9e0e5;
  text-align: left;
}

.markdown-preview th {
  background: #eef4f6;
  color: #111827;
  font-weight: 700;
}

.markdown-preview code {
  border-radius: 5px;
  background: #e9eef2;
  color: #9f1239;
  font: 0.9em/1.5 'SFMono-Regular', Consolas, 'Cascadia Mono', 'Microsoft YaHei UI', 'Liberation Mono', Menlo, ui-monospace, monospace;
}

.markdown-preview :not(pre) > code {
  padding: 2px 5px;
}

.markdown-preview pre {
  overflow: auto;
  padding: 16px;
  border: 1px solid #d9e0e5;
  border-radius: 8px;
  background: #f6f8fa;
}

.markdown-preview pre code {
  padding: 0;
  background: transparent;
}

.markdown-preview input[type='checkbox'] {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  accent-color: #0f766e;
}
`

const highlightStyles = `
.hljs {
  color: #24292f;
  background: #f6f8fa;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-built_in {
  color: #cf222e;
}

.hljs-string,
.hljs-attr,
.hljs-symbol {
  color: #0a3069;
}

.hljs-literal,
.hljs-number,
.hljs-variable {
  color: #0550ae;
}

.hljs-comment {
  color: #6e7781;
}
`

export function buildExportHtml({ title, lang, contentHtml }: BuildExportHtmlOptions): string {
  const safeTitle = escapeHtml(title || 'MDView Export')

  return [
    '<!doctype html>',
    `<html lang="${escapeHtml(lang)}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${safeTitle}</title>`,
    '<style>',
    exportStyles,
    highlightStyles,
    '</style>',
    '</head>',
    '<body>',
    `<article class="markdown-preview" aria-label="Markdown preview">${contentHtml}</article>`,
    '</body>',
    '</html>',
  ].join('\n')
}

export function createExportHtmlDefaultPath(currentPath: string | null, title: string): string {
  if (currentPath) {
    return replacePathExtension(currentPath, 'html')
  }

  return createExportHtmlFilename(title)
}

export function createExportHtmlFilename(title: string): string {
  const sourceName = title.trim() || 'Untitled'
  const stem = stripExtension(sourceName)
  const safeStem = sanitizeFileStem(stem) || 'Untitled'
  return `${safeStem}.html`
}

function replacePathExtension(path: string, extension: string): string {
  const trimmedPath = path.replace(/[\\/]+$/, '')
  const separatorIndex = Math.max(trimmedPath.lastIndexOf('/'), trimmedPath.lastIndexOf('\\'))
  const directory = separatorIndex >= 0 ? trimmedPath.slice(0, separatorIndex + 1) : ''
  const filename = separatorIndex >= 0 ? trimmedPath.slice(separatorIndex + 1) : trimmedPath
  const stem = stripExtension(filename) || 'Untitled'

  return `${directory}${stem}.${extension}`
}

function stripExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex > 0 ? filename.slice(0, dotIndex) : filename
}

function sanitizeFileStem(stem: string): string {
  return Array.from(stem, (character) => (character.charCodeAt(0) < 32 ? '-' : character))
    .join('')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[ .-]+$/g, '')
    .trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
