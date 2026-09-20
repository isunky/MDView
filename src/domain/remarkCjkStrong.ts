import type { Parents, Root, RootContent, Text } from 'mdast'
import type { Plugin } from 'unified'

// Repair plain-text strong spans whose closing punctuation touches CJK prose.
// Work after parsing so code, HTML, math, and escaped delimiters stay literal.
export const remarkCjkStrong: Plugin<[], Root> = () => (tree, file) => {
  const source = String(file)
  function visit(parent: Parents) {
    const children: RootContent[] = []
    for (const node of parent.children) {
      if ('children' in node) visit(node)
      if (node.type !== 'text') {
        children.push(node)
        continue
      }
      const start = node.position?.start.offset
      const end = node.position?.end.offset
      if (start === undefined || end === undefined || source.slice(start, end) !== node.value) {
        children.push(node)
        continue
      }
      const pattern = /(?<![\\*])\*\*([^*\n]*[\p{Script=Han}][^*\n]*[\p{P}])\*\*(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])/gu
      let cursor = 0
      const text = (value: string): Text => ({ type: 'text', value })
      for (const match of node.value.matchAll(pattern)) {
        if (/^\s/u.test(match[1])) continue
        if (match.index > cursor) children.push(text(node.value.slice(cursor, match.index)))
        children.push({ type: 'strong', children: [text(match[1])] })
        cursor = match.index + match[0].length
      }
      if (cursor === 0) children.push(node)
      else if (cursor < node.value.length) children.push(text(node.value.slice(cursor)))
    }
    parent.children = children as Parents['children']
  }
  visit(tree)
}
