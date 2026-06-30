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
  padding: 32px 24px 72px;
  color: #26323f;
  background:
    radial-gradient(circle at 20% 0, rgba(15, 118, 110, 0.06), transparent 34%),
    linear-gradient(180deg, #fbfcfd 0, #f8fafb 220px);
  font: 16px/1.78 'Segoe UI Variable Text', 'Segoe UI', 'Microsoft YaHei UI', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.markdown-preview {
  width: min(940px, 100%);
  margin: 0 auto;
  padding: clamp(34px, 5vw, 56px) clamp(26px, 5vw, 58px) clamp(48px, 7vw, 76px);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 54px rgba(31, 41, 55, 0.08);
  letter-spacing: 0.005em;
  overflow-wrap: break-word;
}

.markdown-preview > :first-child {
  margin-top: 0;
}

.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3,
.markdown-preview h4,
.markdown-preview h5,
.markdown-preview h6 {
  color: #111827;
  line-height: 1.24;
}

.markdown-preview h1 {
  margin: 0 0 28px;
  padding-bottom: 18px;
  border-bottom: 1px solid #d9e0e5;
  font-size: clamp(30px, 4vw, 42px);
  font-weight: 780;
  letter-spacing: -0.03em;
}

.markdown-preview h2 {
  margin: 42px 0 14px;
  padding-top: 4px;
  font-size: clamp(23px, 2.6vw, 29px);
  font-weight: 760;
  letter-spacing: -0.02em;
}

.markdown-preview h3 {
  margin: 32px 0 10px;
  font-size: 20px;
  font-weight: 730;
}

.markdown-preview h4 {
  margin: 28px 0 8px;
  font-size: 17px;
  font-weight: 720;
}

.markdown-preview h5,
.markdown-preview h6 {
  margin: 24px 0 8px;
  color: #667085;
  font-size: 14px;
  font-weight: 760;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.markdown-preview p,
.markdown-preview ul,
.markdown-preview ol,
.markdown-preview blockquote,
.markdown-preview .table-scroll,
.markdown-preview .code-block,
.markdown-preview .markdown-image,
.markdown-preview .mermaid-diagram,
.markdown-preview .mermaid-loading,
.markdown-preview .mermaid-error {
  margin: 0 0 20px;
}

.markdown-preview p {
  margin: 0 0 18px;
}

.markdown-preview ul,
.markdown-preview ol {
  padding-left: 1.55em;
}

.markdown-preview li {
  margin: 4px 0;
  padding-left: 0.18em;
}

.markdown-preview li > p {
  margin: 8px 0;
}

.markdown-preview hr {
  height: 1px;
  margin: 34px 0;
  border: 0;
  background: linear-gradient(90deg, transparent, #d9e0e5, transparent);
}

.markdown-preview a {
  color: #1d4ed8;
  font-weight: 560;
  text-underline-offset: 3px;
  text-decoration-thickness: 0.08em;
}

.markdown-preview strong {
  color: #111827;
  font-weight: 760;
}

.markdown-preview blockquote {
  padding: 14px 18px 14px 20px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-left: 4px solid #0f766e;
  border-radius: 0 12px 12px 0;
  color: #38504d;
  background: #edf7f6;
}

.markdown-preview blockquote > :last-child {
  margin-bottom: 0;
}

.table-scroll {
  overflow: auto;
  border: 1px solid #d9e0e5;
  border-radius: 12px;
  background: white;
}

.markdown-preview table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 14px;
}

.markdown-preview th,
.markdown-preview td {
  padding: 11px 13px;
  border-right: 1px solid #d9e0e5;
  border-bottom: 1px solid #d9e0e5;
  text-align: left;
  vertical-align: top;
}

.markdown-preview th {
  background: #eef4f6;
  color: #111827;
  font-weight: 760;
}

.markdown-preview tr:nth-child(even) td {
  background: #fbfdfe;
}

.markdown-preview tr:last-child td {
  border-bottom: 0;
}

.markdown-preview th:last-child,
.markdown-preview td:last-child {
  border-right: 0;
}

.markdown-preview code {
  border-radius: 5px;
  background: #e9eef2;
  color: #9f1239;
  font: 0.88em/1.5 'SFMono-Regular', Consolas, 'Cascadia Mono', 'Microsoft YaHei UI', 'Liberation Mono', Menlo, ui-monospace, monospace;
}

.markdown-preview :not(pre) > code {
  padding: 2px 5px 3px;
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.code-block {
  overflow: hidden;
  border: 1px solid #d9e0e5;
  border-radius: 12px;
  background: #f6f8fa;
}

.code-block-header {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 10px 7px 14px;
  border-bottom: 1px solid #d9e0e5;
  color: #667085;
  background: #eef3f6;
  font: 730 12px/1.2 'Segoe UI Variable Text', 'Segoe UI', 'Microsoft YaHei UI', 'Microsoft YaHei', system-ui, sans-serif;
  letter-spacing: 0.02em;
}

.code-block button {
  display: none;
}

.markdown-preview pre {
  overflow: auto;
  margin: 0;
  padding: 17px 18px;
  background: transparent;
  font-size: 14px;
  tab-size: 2;
}

.markdown-preview pre code {
  padding: 0;
  border: 0;
  background: transparent;
}

.markdown-preview input[type='checkbox'] {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  accent-color: #0f766e;
  transform: translateY(2px);
}

.markdown-preview li:has(input[type='checkbox']) {
  list-style: none;
  margin-left: -1.25em;
}

.markdown-image {
  display: block;
  text-align: center;
}

.markdown-preview img {
  max-width: 100%;
  max-height: min(68vh, 760px);
  height: auto;
  object-fit: contain;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 14px;
  background: #fbfdfe;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.08);
}

.markdown-image-caption {
  display: block;
  margin-top: 8px;
  color: #667085;
  font: 13px/1.45 'Segoe UI Variable Text', 'Segoe UI', 'Microsoft YaHei UI', 'Microsoft YaHei', system-ui, sans-serif;
}

.mermaid-diagram,
.mermaid-loading,
.mermaid-error {
  margin: 0 0 20px;
  border: 1px solid #d9e0e5;
  border-radius: 12px;
  background: white;
}

.mermaid-diagram {
  overflow: auto;
  padding: 22px;
}

.mermaid-diagram svg {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

.mermaid-loading {
  padding: 16px 18px;
  color: #667085;
  font: 13px/1.45 'Segoe UI Variable Text', 'Segoe UI', 'Microsoft YaHei UI', 'Microsoft YaHei', system-ui, sans-serif;
}

.mermaid-error {
  display: grid;
  gap: 8px;
  padding: 16px 18px;
  color: #991b1b;
  background: #fef2f2;
}

@media (max-width: 680px) {
  body {
    padding: 16px 14px 48px;
  }

  .markdown-preview {
    padding-top: 28px;
    border-radius: 14px;
  }
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
