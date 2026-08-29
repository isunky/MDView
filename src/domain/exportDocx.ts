import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  LineRuleType,
  Math as DocxMath,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableLayoutType,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlign,
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
import remarkMath from 'remark-math'
import type { InlineMath, Math as MarkdownMath } from 'mdast-util-math'
import { resolveLocalMarkdownResource } from './localMarkdownResources'
import { createExportDisplayTitle } from './exportDisplayTitle'
import type { LocalImageFile } from '../platform/fileAccess'

type BuildExportDocxOptions = {
  title: string
  content: string
  sourcePath: string | null
  readLocalImageFile: (path: string) => Promise<LocalImageFile>
}

type ConversionContext = {
  sourceContent: string
  sourcePath: string | null
  readLocalImageFile: (path: string) => Promise<LocalImageFile>
  formulaImageFallbacks: number
  formulaTextFallbacks: number
  nextOrderedListInstance: number
}

export type DocxExportResult = {
  bytes: Uint8Array
  formulaImageFallbacks: number
  formulaTextFallbacks: number
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
const bodyFont = {
  ascii: 'SimSun',
  hAnsi: 'SimSun',
  eastAsia: 'SimSun',
  cs: 'SimSun',
}
const headingFont = {
  ascii: 'SimHei',
  hAnsi: 'SimHei',
  eastAsia: 'SimHei',
  cs: 'SimHei',
}

type DocxImageData = {
  type: 'png' | 'jpg' | 'gif' | 'bmp'
  bytes: Uint8Array
}
const codeFont = {
  ascii: 'Cascadia Mono',
  hAnsi: 'Cascadia Mono',
  eastAsia: 'Microsoft YaHei UI',
  cs: 'Cascadia Mono',
}
const bodyFontSize = 28
const bodyFirstLineIndent = 560

export async function buildExportDocx({
  title,
  content,
  sourcePath,
  readLocalImageFile,
}: BuildExportDocxOptions): Promise<DocxExportResult> {
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(content) as Root
  const context: ConversionContext = {
    sourceContent: content,
    sourcePath,
    readLocalImageFile,
    formulaImageFallbacks: 0,
    formulaTextFallbacks: 0,
    nextOrderedListInstance: 1,
  }
  const children = await convertBlocks(tree.children, context)
  const documentTitle = title || 'MDView Export'
  const headerTitle = createExportDisplayTitle(documentTitle)
  const document = new Document({
    title: documentTitle,
    creator: 'MDView',
    description: 'Exported from MDView',
    styles: {
      default: {
        document: {
          run: { font: bodyFont, size: bodyFontSize, color: '26323F' },
          paragraph: {
            spacing: { after: 180, line: 360, lineRule: LineRuleType.AUTO },
          },
        },
        heading1: createHeadingStyle(32, 0, 280),
        heading2: createHeadingStyle(30, 420, 160),
        heading3: createHeadingStyle(28, 340, 140),
        heading4: createHeadingStyle(26, 300, 120),
        heading5: createHeadingStyle(24, 260, 100, '475467'),
        heading6: createHeadingStyle(22, 240, 100, '667085'),
        listParagraph: {
          run: { font: bodyFont, size: bodyFontSize, color: '26323F' },
          paragraph: { spacing: { after: 90, line: 340, lineRule: LineRuleType.AUTO } },
        },
        hyperlink: {
          run: { color: '1D4ED8', underline: { type: UnderlineType.SINGLE } },
        },
      },
    },
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
                  left: bodyFirstLineIndent + 420 + level * 360,
                  hanging: 420,
                },
              },
            },
          })),
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: millimetersToTwip(20),
              right: millimetersToTwip(14),
              bottom: millimetersToTwip(20),
              left: millimetersToTwip(14),
              header: millimetersToTwip(8),
              footer: millimetersToTwip(8),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: headerTitle, font: headingFont, size: 18, color: '667085' })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], font: bodyFont, size: 18, color: '667085' })],
              }),
            ],
          }),
        },
        children: children.length > 0 ? children : [new Paragraph('')],
      },
    ],
  })
  const buffer = await Packer.toArrayBuffer(document)

  return { bytes: new Uint8Array(buffer), formulaImageFallbacks: context.formulaImageFallbacks, formulaTextFallbacks: context.formulaTextFallbacks }
}

function createHeadingStyle(size: number, before: number, after: number, color = '111827') {
  return {
    run: { font: headingFont, size, bold: true, color },
    paragraph: {
      spacing: { before, after, line: 280, lineRule: LineRuleType.AUTO },
      keepNext: true,
      keepLines: true,
    },
  }
}

function millimetersToTwip(value: number): number {
  return Math.round(value * 1440 / 25.4)
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
    case 'paragraph': {
      const isStandaloneImage = node.children.length === 1 && node.children[0].type === 'image'
      return [new Paragraph({
        children: await convertInlineChildren(node.children, context),
        ...(isStandaloneImage
          ? { alignment: AlignmentType.CENTER, spacing: { before: 160, after: 220 } }
          : { indent: { firstLine: bodyFirstLineIndent } }),
      })]
    }
    case 'list':
      return convertList(node, context, listLevel)
    case 'blockquote':
      return convertBlockquote(node.children)
    case 'code':
      return [convertCodeBlock(node.value, node.lang)]
    case 'table':
      return [await convertTable(node, context)]
    case 'thematicBreak':
      return isExplicitThematicBreak(node, context.sourceContent)
        ? [
            new Paragraph({
              children: [new TextRun('')],
              thematicBreak: true,
            }),
          ]
        : []
    case 'html':
      return convertHtmlBlock(node.value)
    case 'math':
      return [await convertBlockMath(node as MarkdownMath, context)]
    default:
      return toString(node as RootContent).trim()
        ? [new Paragraph({
            children: [new TextRun(toString(node as RootContent))],
            indent: { firstLine: bodyFirstLineIndent },
          })]
        : []
  }
}

async function convertHeading(node: Heading, context: ConversionContext): Promise<Paragraph> {
  const heading = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ][node.depth - 1]

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
  const numberingInstance = node.ordered ? context.nextOrderedListInstance++ : undefined

  for (const item of node.children) {
    blocks.push(...await convertListItem(item, node.ordered ?? false, level, numberingInstance, context))
  }

  return blocks
}

async function convertListItem(
  item: ListItem,
  ordered: boolean,
  level: number,
  numberingInstance: number | undefined,
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
    ? { numbering: { reference: orderedListReference, level, instance: numberingInstance } }
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
      spacing: { before: 80, after: 180, line: 340, lineRule: LineRuleType.AUTO },
      shading: { type: ShadingType.CLEAR, fill: 'EDF7F6', color: 'auto' },
      border: {
        left: { style: BorderStyle.SINGLE, size: 8, color: '0F766E', space: 8 },
      },
    }))
}

function convertCodeBlock(value: string, language: string | null | undefined): Paragraph {
  const lines = value.split('\n')

  return new Paragraph({
    children: [
      ...(language
        ? [
            new TextRun({ text: language.toUpperCase(), font: codeFont, size: 16, bold: true, color: '667085' }),
            new TextRun({ break: 1 }),
          ]
        : []),
      ...lines.flatMap((line, index) => [
      ...(index > 0 ? [new TextRun({ break: 1 })] : []),
      new TextRun({
        text: line || ' ',
        font: codeFont,
        size: 20,
        color: '24292F',
      }),
      ]),
    ],
    shading: {
      type: ShadingType.CLEAR,
      fill: 'F6F8FA',
      color: 'auto',
    },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'D9E0E5', space: 8 },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'D9E0E5', space: 8 },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D9E0E5', space: 8 },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'D9E0E5', space: 8 },
    },
    indent: { left: 140, right: 140 },
    spacing: { before: 120, after: 220, line: 300, lineRule: LineRuleType.AUTO },
  })
}

function isExplicitThematicBreak(node: RootContent, sourceContent: string): boolean {
  const start = node.position?.start.offset
  const end = node.position?.end.offset
  if (start === undefined || end === undefined) return false

  const source = sourceContent.slice(start, end).trim()
  return /^(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(source)
}

async function convertTable(
  node: MarkdownTable,
  context: ConversionContext,
): Promise<Table> {
  const rows = await Promise.all(
    node.children.map(async (row, rowIndex) => new TableRow({
      cantSplit: true,
      tableHeader: rowIndex === 0,
      children: await Promise.all(
        row.children.map((cell) => convertTableCell(cell, context, rowIndex)),
      ),
    })),
  )

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    alignment: AlignmentType.CENTER,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'D9E0E5' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'D9E0E5' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D9E0E5' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'D9E0E5' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'D9E0E5' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'D9E0E5' },
    },
  })
}

async function convertTableCell(
  cell: MarkdownTableCell,
  context: ConversionContext,
  rowIndex: number,
): Promise<TableCell> {
  const isHeader = rowIndex === 0
  const children = await convertInlineChildren(cell.children, context, isHeader ? { bold: true } : {})

  return new TableCell({
    children: [
      new Paragraph({
        children: children.length > 0 ? children : [new TextRun('')],
        spacing: { after: 0, line: 300, lineRule: LineRuleType.AUTO },
      }),
    ],
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    shading: {
      type: ShadingType.CLEAR,
      fill: isHeader ? 'EEF4F6' : rowIndex % 2 === 0 ? 'FBFDFE' : 'FFFFFF',
      color: 'auto',
    },
  })
}

function convertHtmlBlock(value: string): DocxBlock[] {
  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text
    ? [new Paragraph({
        children: [new TextRun(text)],
        indent: { firstLine: bodyFirstLineIndent },
      })]
    : []
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
    case 'inlineMath':
      return [await convertInlineMath(node as InlineMath, context)]
    default:
      return toString(node).trim() ? [createTextRun(toString(node), style)] : []
  }
}

async function convertBlockMath(node: MarkdownMath, context: ConversionContext): Promise<Paragraph> {
  const child = await convertMath(node.value, true, context)
  return new Paragraph({ children: [child], alignment: AlignmentType.CENTER, spacing: { before: 180, after: 220 } })
}

async function convertInlineMath(node: InlineMath, context: ConversionContext): Promise<ParagraphChild> {
  return convertMath(node.value, false, context)
}

async function convertMath(latex: string, displayMode: boolean, context: ConversionContext): Promise<ParagraphChild> {
  try {
    const { convertLatexToDocxMath } = await import('./docxMath')
    const math = convertLatexToDocxMath(latex)
    if (math) return math as DocxMath
  } catch {
    // Fall through to a visual representation for unsupported LaTeX structures.
  }

  try {
    const { renderLatexToPng } = await import('./docxMathImage')
    const image = await renderLatexToPng(latex, displayMode)
    context.formulaImageFallbacks += 1
    return new ImageRun({
      type: 'png',
      data: image.bytes,
      transformation: { width: image.width, height: image.height },
      altText: { title: 'Math formula', description: latex, name: 'Math formula' },
    })
  } catch {
    context.formulaTextFallbacks += 1
    return createTextRun(latex, { code: true })
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
        transformation: createImageTransformation(imageData),
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
    ...(style.code
      ? {
          font: codeFont,
          size: 20,
          color: '9F1239',
          shading: { type: ShadingType.CLEAR, fill: 'E9EEF2', color: 'auto' },
        }
      : {}),
    ...(style.link
      ? {
          color: '1D4ED8',
          underline: { type: UnderlineType.SINGLE },
        }
      : {}),
  })
}

function dataUrlToImageData(dataUrl: string): DocxImageData | null {
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

function createImageTransformation(image: DocxImageData): { width: number; height: number } {
  const dimensions = readImageDimensions(image)
  if (!dimensions) return { width: 480, height: 270 }

  const scale = Math.min(1, 560 / dimensions.width, 420 / dimensions.height)
  return {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
  }
}

function readImageDimensions(image: DocxImageData): { width: number; height: number } | null {
  const { bytes, type } = image

  if (type === 'png' && bytes.length >= 24) {
    return validDimensions(readUint32Be(bytes, 16), readUint32Be(bytes, 20))
  }

  if (type === 'gif' && bytes.length >= 10) {
    return validDimensions(readUint16Le(bytes, 6), readUint16Le(bytes, 8))
  }

  if (type === 'bmp' && bytes.length >= 26) {
    return validDimensions(readUint32Le(bytes, 18), Math.abs(readInt32Le(bytes, 22)))
  }

  if (type === 'jpg') {
    return readJpegDimensions(bytes)
  }

  return null
}

function readJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 2

  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = bytes[offset + 1]
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3]
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf
      && ![0xc4, 0xc8, 0xcc].includes(marker)

    if (isStartOfFrame && offset + 8 < bytes.length) {
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6]
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8]
      return validDimensions(width, height)
    }

    if (segmentLength < 2) break
    offset += 2 + segmentLength
  }

  return null
}

function validDimensions(width: number, height: number): { width: number; height: number } | null {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? { width, height }
    : null
}

function readUint16Le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readUint32Be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) >>> 0)
    + (bytes[offset + 1] << 16)
    + (bytes[offset + 2] << 8)
    + bytes[offset + 3]
}

function readUint32Le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]
    + (bytes[offset + 1] << 8)
    + (bytes[offset + 2] << 16)
    + ((bytes[offset + 3] << 24) >>> 0)) >>> 0
}

function readInt32Le(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getInt32(0, true)
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
