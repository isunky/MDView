import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  convertInchesToTwip,
  type ParagraphChild,
} from 'docx'
import type {
  Content,
  Heading,
  Image,
  Link,
  List,
  ListItem,
  PhrasingContent,
  Root,
  RootContent,
  Table as MarkdownTable,
  TableCell as MarkdownTableCell,
} from 'mdast'
import { toString } from 'mdast-util-to-string'
import { unified } from 'unified'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { resolveLocalMarkdownResource } from './localMarkdownResources'
import type { LocalImageFile } from '../platform/fileAccess'

type BuildExportDocxOptions = {
  title: string
  content: string
  sourcePath: string | null
  readLocalImageFile: (path: string) => Promise<LocalImageFile>
}

type ConversionContext = {
  sourcePath: string | null
  readLocalImageFile: (path: string) => Promise<LocalImageFile>
}

type DocxBlock = Paragraph | Table

type TextStyle = {
  bold?: boolean
  italics?: boolean
  strike?: boolean
  code?: boolean
  link?: boolean
}

const orderedListReference = 'mdview-numbered-list'
const maxListLevel = 5

export async function buildExportDocx({
  title,
  content,
  sourcePath,
  readLocalImageFile,
}: BuildExportDocxOptions): Promise<Uint8Array> {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(content) as Root
  const children = await convertBlocks(tree.children, { sourcePath, readLocalImageFile })
  const document = new Document({
    title: title || 'MDView Export',
    creator: 'MDView',
    description: 'Exported from MDView',
    numbering: {
      config: [
        {
          reference: orderedListReference,
          levels: Array.from({ length: maxListLevel + 1 }, (_, level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: {
              paragraph: {
                indent: {
                  left: convertInchesToTwip(0.35 + level * 0.25),
                  hanging: convertInchesToTwip(0.18),
                },
              },
            },
          })),
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: children.length > 0 ? children : [new Paragraph('')],
      },
    ],
  })
  const buffer = await Packer.toArrayBuffer(document)

  return new Uint8Array(buffer)
}

export function createExportDocxDefaultPath(currentPath: string | null, title: string): string {
  if (currentPath) {
    return replacePathExtension(currentPath, 'docx')
  }

  return createExportDocxFilename(title)
}

export function createExportDocxFilename(title: string): string {
  const sourceName = title.trim() || 'Untitled'
  const stem = stripExtension(sourceName)
  const safeStem = sanitizeFileStem(stem) || 'Untitled'
  return `${safeStem}.docx`
}

async function convertBlocks(
  nodes: readonly Content[],
  context: ConversionContext,
  listLevel = 0,
): Promise<DocxBlock[]> {
  const blocks: DocxBlock[] = []

  for (const node of nodes) {
    blocks.push(...await convertBlock(node, context, listLevel))
  }

  return blocks
}

async function convertBlock(
  node: Content,
  context: ConversionContext,
  listLevel: number,
): Promise<DocxBlock[]> {
  switch (node.type) {
    case 'heading':
      return [await convertHeading(node, context)]
    case 'paragraph':
      return [new Paragraph({ children: await convertInlineChildren(node.children, context) })]
    case 'list':
      return convertList(node, context, listLevel)
    case 'blockquote':
      return convertBlockquote(node.children)
    case 'code':
      return [convertCodeBlock(node.value, node.lang)]
    case 'table':
      return [await convertTable(node, context)]
    case 'thematicBreak':
      return [
        new Paragraph({
          children: [new TextRun('')],
          thematicBreak: true,
        }),
      ]
    case 'html':
      return convertHtmlBlock(node.value)
    default:
      return toString(node as RootContent).trim()
        ? [new Paragraph(toString(node as RootContent))]
        : []
  }
}

async function convertHeading(node: Heading, context: ConversionContext): Promise<Paragraph> {
  const heading = node.depth === 1
    ? HeadingLevel.HEADING_1
    : node.depth === 2
      ? HeadingLevel.HEADING_2
      : HeadingLevel.HEADING_3

  return new Paragraph({
    heading,
    children: await convertInlineChildren(node.children, context),
  })
}

async function convertList(
  node: List,
  context: ConversionContext,
  listLevel: number,
): Promise<DocxBlock[]> {
  const blocks: DocxBlock[] = []
  const level = Math.min(listLevel, maxListLevel)

  for (const item of node.children) {
    blocks.push(...await convertListItem(item, node.ordered ?? false, level, context))
  }

  return blocks
}

async function convertListItem(
  item: ListItem,
  ordered: boolean,
  level: number,
  context: ConversionContext,
): Promise<DocxBlock[]> {
  const blocks: DocxBlock[] = []
  const [firstChild, ...remainingChildren] = item.children
  const marker = item.checked === null || item.checked === undefined
    ? ''
    : item.checked
      ? '[x] '
      : '[ ] '
  const listOptions = ordered
    ? { numbering: { reference: orderedListReference, level } }
    : { bullet: { level } }

  if (firstChild?.type === 'paragraph') {
    blocks.push(new Paragraph({
      ...listOptions,
      children: [
        ...(marker ? [new TextRun(marker)] : []),
        ...await convertInlineChildren(firstChild.children, context),
      ],
    }))
  } else if (firstChild) {
    blocks.push(new Paragraph({
      ...listOptions,
      children: [new TextRun(`${marker}${toString(firstChild).trim()}`)],
    }))
  }

  for (const child of remainingChildren) {
    if (child.type === 'list') {
      blocks.push(...await convertList(child, context, level + 1))
    } else {
      blocks.push(...await convertBlock(child, context, level))
    }
  }

  return blocks
}

async function convertBlockquote(children: readonly Content[]): Promise<DocxBlock[]> {
  return children
    .map((child) => toString(child).trim())
    .filter(Boolean)
    .map((text) => new Paragraph({
      children: [new TextRun({ text, italics: true, color: '475467' })],
      indent: { left: convertInchesToTwip(0.25) },
      border: {
        left: { style: BorderStyle.SINGLE, size: 8, color: '0F766E', space: 8 },
      },
    }))
}

function convertCodeBlock(value: string, language: string | null | undefined): Paragraph {
  const label = language ? `${language}\n` : ''
  const lines = `${label}${value}`.split('\n')

  return new Paragraph({
    children: lines.flatMap((line, index) => [
      ...(index > 0 ? [new TextRun({ break: 1 })] : []),
      new TextRun({
        text: line || ' ',
        font: 'Consolas',
        size: 20,
        color: '24292F',
      }),
    ]),
    shading: {
      type: ShadingType.CLEAR,
      fill: 'F6F8FA',
      color: 'auto',
    },
    spacing: { before: 120, after: 180 },
  })
}

async function convertTable(
  node: MarkdownTable,
  context: ConversionContext,
): Promise<Table> {
  const rows = await Promise.all(
    node.children.map(async (row, rowIndex) => new TableRow({
      children: await Promise.all(
        row.children.map((cell) => convertTableCell(cell, context, rowIndex === 0)),
      ),
    })),
  )

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

async function convertTableCell(
  cell: MarkdownTableCell,
  context: ConversionContext,
  isHeader: boolean,
): Promise<TableCell> {
  const children = await convertInlineChildren(cell.children, context, isHeader ? { bold: true } : {})

  return new TableCell({
    children: [
      new Paragraph({
        children: children.length > 0 ? children : [new TextRun('')],
      }),
    ],
    shading: isHeader
      ? {
          type: ShadingType.CLEAR,
          fill: 'EEF4F6',
          color: 'auto',
        }
      : undefined,
  })
}

function convertHtmlBlock(value: string): DocxBlock[] {
  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text ? [new Paragraph(text)] : []
}

async function convertInlineChildren(
  nodes: readonly PhrasingContent[],
  context: ConversionContext,
  style: TextStyle = {},
): Promise<ParagraphChild[]> {
  const children: ParagraphChild[] = []

  for (const node of nodes) {
    children.push(...await convertInlineNode(node, context, style))
  }

  return children.length > 0 ? children : [new TextRun('')]
}

async function convertInlineNode(
  node: PhrasingContent,
  context: ConversionContext,
  style: TextStyle,
): Promise<ParagraphChild[]> {
  switch (node.type) {
    case 'text':
      return [createTextRun(node.value, style)]
    case 'inlineCode':
      return [createTextRun(node.value, { ...style, code: true })]
    case 'strong':
      return convertInlineChildren(node.children, context, { ...style, bold: true })
    case 'emphasis':
      return convertInlineChildren(node.children, context, { ...style, italics: true })
    case 'delete':
      return convertInlineChildren(node.children, context, { ...style, strike: true })
    case 'break':
      return [new TextRun({ break: 1 })]
    case 'link':
      return [await convertLink(node, context, style)]
    case 'image':
      return convertImage(node, context)
    case 'html':
      return convertInlineHtml(node.value, style)
    default:
      return toString(node).trim() ? [createTextRun(toString(node), style)] : []
  }
}

async function convertLink(
  node: Link,
  context: ConversionContext,
  style: TextStyle,
): Promise<ExternalHyperlink> {
  const children = await convertInlineChildren(node.children, context, { ...style, link: true })

  return new ExternalHyperlink({
    link: node.url,
    children,
  })
}

async function convertImage(
  node: Image,
  context: ConversionContext,
): Promise<ParagraphChild[]> {
  const resource = resolveLocalMarkdownResource(node.url, context.sourcePath)

  if (resource?.kind !== 'image') {
    return [createTextRun(node.alt ? `Image: ${node.alt}` : `Image: ${node.url}`, { italics: true })]
  }

  try {
    const imageFile = await context.readLocalImageFile(resource.path)
    const imageData = dataUrlToImageData(imageFile.dataUrl)

    if (!imageData) {
      return [createTextRun(node.alt ? `Image: ${node.alt}` : `Image: ${resource.path}`, { italics: true })]
    }

    return [
      new ImageRun({
        type: imageData.type,
        data: imageData.bytes,
        transformation: {
          width: 480,
          height: 270,
        },
        altText: {
          title: node.alt ?? 'Markdown image',
          description: node.alt ?? resource.path,
          name: node.alt ?? 'Markdown image',
        },
      }),
    ]
  } catch {
    return [createTextRun(node.alt ? `Image: ${node.alt}` : `Image: ${resource.path}`, { italics: true })]
  }
}

function convertInlineHtml(value: string, style: TextStyle): ParagraphChild[] {
  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')

  if (!text) {
    return []
  }

  return text.split('\n').flatMap((line, index) => [
    ...(index > 0 ? [new TextRun({ break: 1 })] : []),
    createTextRun(line, style),
  ])
}

function createTextRun(text: string, style: TextStyle): TextRun {
  return new TextRun({
    text,
    ...(style.bold ? { bold: true } : {}),
    ...(style.italics ? { italics: true } : {}),
    ...(style.strike ? { strike: true } : {}),
    ...(style.code ? { font: 'Consolas', color: '9F1239' } : {}),
    ...(style.link
      ? {
          color: '1D4ED8',
          underline: { type: UnderlineType.SINGLE },
        }
      : {}),
  })
}

function dataUrlToImageData(dataUrl: string):
  | { type: 'png' | 'jpg' | 'gif' | 'bmp'; bytes: Uint8Array }
  | null {
  const match = /^data:([^;,]+);base64,(.*)$/i.exec(dataUrl)
  if (!match) {
    return null
  }

  const type = mimeTypeToDocxImageType(match[1])
  if (!type) {
    return null
  }

  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return { type, bytes }
}

function mimeTypeToDocxImageType(mimeType: string): 'png' | 'jpg' | 'gif' | 'bmp' | null {
  switch (mimeType.toLowerCase()) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg'
    case 'image/gif':
      return 'gif'
    case 'image/bmp':
      return 'bmp'
    default:
      return null
  }
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
