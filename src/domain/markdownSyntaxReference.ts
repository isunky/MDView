export type MarkdownSyntaxItem = {
  id: string
  name: string
  syntax: string
  description: string
}

export type MarkdownSyntaxSection = {
  id: string
  title: string
  items: MarkdownSyntaxItem[]
}

const sharedSyntax = {
  headings: '# Heading 1\n## Heading 2\n### Heading 3',
  bold: '**Bold text**',
  italic: '*Italic text*',
  boldItalic: '***Bold italic text***',
  strikethrough: '~~Deleted text~~',
  inlineCode: '`const value = 1`',
  escape: '\\*Literal asterisks\\*',
  bulletedList: '- First item\n- Second item',
  numberedList: '1. First item\n2. Second item',
  nestedList: '- Parent item\n  - Nested item',
  taskList: '- [ ] Pending task\n- [x] Completed task',
  quote: '> Quoted text',
  divider: '---',
  webLink: '[OpenAI](https://openai.com)',
  autoLink: '<https://example.com>',
  localLink: '[Install guide](guide.md#installation)',
  image: '![Alternative text](assets/image.png)',
  imageTitle: '![Alternative text](assets/image.png "Image title")',
  codeBlock: '```js\nconsole.log("Hello, MDView")\n```',
  table: '| Name | Status |\n| :--- | ---: |\n| MDView | Ready |',
  mermaid: '```mermaid\nflowchart TD\n  A[Start] --> B[Finish]\n```',
  color: '`#1769FF`',
  details: '<details>\n<summary>More details</summary>\n\nHidden content\n</details>',
  htmlImage: '<p align="center">\n  <img src="assets/logo.png" alt="Logo" width="112" />\n</p>',
}

export const markdownSyntaxReference: Record<'en' | 'zh', MarkdownSyntaxSection[]> = {
  en: [
    {
      id: 'basic-formatting',
      title: 'Basic formatting',
      items: [
        { id: 'headings', name: 'Headings', syntax: sharedSyntax.headings, description: 'Use one to six # characters for heading levels 1 through 6.' },
        { id: 'bold', name: 'Bold', syntax: sharedSyntax.bold, description: 'Use two asterisks around important text.' },
        { id: 'italic', name: 'Italic', syntax: sharedSyntax.italic, description: 'Use one asterisk around emphasized text.' },
        { id: 'bold-italic', name: 'Bold italic', syntax: sharedSyntax.boldItalic, description: 'Combine bold and italic emphasis.' },
        { id: 'strikethrough', name: 'Strikethrough', syntax: sharedSyntax.strikethrough, description: 'GFM syntax for text that is no longer applicable.' },
        { id: 'inline-code', name: 'Inline code', syntax: sharedSyntax.inlineCode, description: 'Wrap a short command or identifier in backticks.' },
        { id: 'escape', name: 'Escape characters', syntax: sharedSyntax.escape, description: 'Use a backslash to display Markdown punctuation literally.' },
      ],
    },
    {
      id: 'lists-and-blocks',
      title: 'Lists and blocks',
      items: [
        { id: 'bulleted-list', name: 'Bulleted list', syntax: sharedSyntax.bulletedList, description: 'Start each item with -, * or +.' },
        { id: 'numbered-list', name: 'Numbered list', syntax: sharedSyntax.numberedList, description: 'Start each item with a number and a period.' },
        { id: 'nested-list', name: 'Nested list', syntax: sharedSyntax.nestedList, description: 'Indent child items beneath their parent.' },
        { id: 'task-list', name: 'Task list', syntax: sharedSyntax.taskList, description: 'Use [ ] for pending and [x] for completed tasks.' },
        { id: 'quote', name: 'Blockquote', syntax: sharedSyntax.quote, description: 'Start a paragraph with > to create a quote.' },
        { id: 'divider', name: 'Divider', syntax: sharedSyntax.divider, description: 'Place three hyphens on their own line.' },
      ],
    },
    {
      id: 'links-and-media',
      title: 'Links and media',
      items: [
        { id: 'web-link', name: 'Web link', syntax: sharedSyntax.webLink, description: 'Web links open in the default browser.' },
        { id: 'auto-link', name: 'Automatic link', syntax: sharedSyntax.autoLink, description: 'Angle brackets turn a URL into a clickable link.' },
        { id: 'local-link', name: 'Local Markdown link', syntax: sharedSyntax.localLink, description: 'Open another Markdown file and optionally jump to a heading.' },
        { id: 'image', name: 'Relative image', syntax: sharedSyntax.image, description: 'Resolve an image path relative to the current document.' },
        { id: 'image-title', name: 'Image with title', syntax: sharedSyntax.imageTitle, description: 'Add optional hover text after the image path.' },
      ],
    },
    {
      id: 'code-and-tables',
      title: 'Code and tables',
      items: [
        { id: 'code-block', name: 'Fenced code block', syntax: sharedSyntax.codeBlock, description: 'Add a language after the opening fence for syntax highlighting.' },
        { id: 'table', name: 'Aligned table', syntax: sharedSyntax.table, description: 'Use colons in the separator row to align a column.' },
      ],
    },
    {
      id: 'mdview-enhancements',
      title: 'MDView enhancements',
      items: [
        { id: 'mermaid', name: 'Mermaid diagram', syntax: sharedSyntax.mermaid, description: 'Render Mermaid source from a mermaid fenced code block.' },
        { id: 'color', name: 'Color preview', syntax: sharedSyntax.color, description: 'Hex colors display a matching swatch in Preview.' },
        { id: 'details', name: 'Collapsible details', syntax: sharedSyntax.details, description: 'Use safe HTML to create expandable content.' },
        { id: 'html-image', name: 'HTML image layout', syntax: sharedSyntax.htmlImage, description: 'Safe HTML can align an image and set its display size.' },
      ],
    },
  ],
  zh: [
    {
      id: 'basic-formatting',
      title: '基础排版',
      items: [
        { id: 'headings', name: '标题', syntax: '# 一级标题\n## 二级标题\n### 三级标题', description: '使用 1 至 6 个 # 表示一级到六级标题。' },
        { id: 'bold', name: '粗体', syntax: '**粗体文字**', description: '使用两个星号包围需要强调的内容。' },
        { id: 'italic', name: '斜体', syntax: '*斜体文字*', description: '使用一个星号包围需要强调的内容。' },
        { id: 'bold-italic', name: '粗斜体', syntax: '***粗斜体文字***', description: '同时使用粗体和斜体效果。' },
        { id: 'strikethrough', name: '删除线', syntax: '~~已删除文字~~', description: '用于表示已经失效或不再适用的内容。' },
        { id: 'inline-code', name: '行内代码', syntax: sharedSyntax.inlineCode, description: '使用反引号包围简短命令、变量或文件名。' },
        { id: 'escape', name: '字符转义', syntax: '\\*原样显示星号\\*', description: '在 Markdown 标记前添加反斜杠以原样显示。' },
      ],
    },
    {
      id: 'lists-and-blocks',
      title: '列表与区块',
      items: [
        { id: 'bulleted-list', name: '无序列表', syntax: '- 第一项\n- 第二项', description: '每一项以 -、* 或 + 开头。' },
        { id: 'numbered-list', name: '有序列表', syntax: '1. 第一项\n2. 第二项', description: '每一项以数字和句点开头。' },
        { id: 'nested-list', name: '嵌套列表', syntax: '- 父级项目\n  - 子级项目', description: '缩进子项目即可创建列表层级。' },
        { id: 'task-list', name: '任务列表', syntax: '- [ ] 待处理\n- [x] 已完成', description: '使用 [ ] 表示待处理，[x] 表示已完成。' },
        { id: 'quote', name: '引用', syntax: '> 引用内容', description: '在段落开头添加 > 创建引用区块。' },
        { id: 'divider', name: '分隔线', syntax: sharedSyntax.divider, description: '单独一行输入三个连字符。' },
      ],
    },
    {
      id: 'links-and-media',
      title: '链接与媒体',
      items: [
        { id: 'web-link', name: '网页链接', syntax: '[OpenAI](https://openai.com)', description: '网页链接会使用系统默认浏览器打开。' },
        { id: 'auto-link', name: '自动链接', syntax: sharedSyntax.autoLink, description: '使用尖括号包围网址即可生成可点击链接。' },
        { id: 'local-link', name: '本地 Markdown 链接', syntax: '[安装指南](guide.md#安装)', description: '打开其他 Markdown 文件，并可跳转到指定标题。' },
        { id: 'image', name: '相对路径图片', syntax: '![替代文本](assets/image.png)', description: '图片路径以当前 Markdown 文件所在目录为基准。' },
        { id: 'image-title', name: '带标题的图片', syntax: '![替代文本](assets/image.png "图片标题")', description: '在图片路径后添加可选的悬停说明。' },
      ],
    },
    {
      id: 'code-and-tables',
      title: '代码与表格',
      items: [
        { id: 'code-block', name: '围栏代码块', syntax: sharedSyntax.codeBlock, description: '在开始标记后注明语言即可启用语法高亮。' },
        { id: 'table', name: '对齐表格', syntax: '| 名称 | 状态 |\n| :--- | ---: |\n| MDView | 可用 |', description: '在分隔行添加冒号控制列的左对齐、右对齐或居中。' },
      ],
    },
    {
      id: 'mdview-enhancements',
      title: 'MDView 增强',
      items: [
        { id: 'mermaid', name: 'Mermaid 图表', syntax: '```mermaid\nflowchart TD\n  A[开始] --> B[结束]\n```', description: '使用 mermaid 围栏代码块渲染流程图等图表。' },
        { id: 'color', name: '颜色预览', syntax: sharedSyntax.color, description: '预览模式会在十六进制颜色值旁显示对应色块。' },
        { id: 'details', name: '折叠内容', syntax: '<details>\n<summary>展开查看</summary>\n\n隐藏内容\n</details>', description: '使用安全 HTML 创建可展开和收起的内容。' },
        { id: 'html-image', name: 'HTML 图片布局', syntax: sharedSyntax.htmlImage, description: '安全 HTML 可以设置图片对齐方式和展示尺寸。' },
      ],
    },
  ],
}
