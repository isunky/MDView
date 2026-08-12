import {
  Math as DocxMath,
  MathAngledBrackets,
  MathCurlyBrackets,
  MathFraction,
  MathFunction,
  MathIntegral,
  MathRadical,
  MathRoundBrackets,
  MathRun,
  MathSquareBrackets,
  MathSubScript,
  MathSubSuperScript,
  MathSum,
  MathSuperScript,
  type MathComponent,
} from 'docx'
import { parseMath } from '@unified-latex/unified-latex-util-parse'
import type { Node as LatexNode } from '@unified-latex/unified-latex-types'

const symbols: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', phi: 'φ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Omega: 'Ω',
  cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', infty: '∞', partial: '∂', nabla: '∇',
  to: '→', rightarrow: '→', leftarrow: '←', Leftrightarrow: '⇔', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩', forall: '∀', exists: '∃',
}

const functions = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'lim', 'max', 'min', 'exp'])

export function convertLatexToDocxMath(latex: string): DocxMath | null {
  try {
    const components = convertNodes(parseMath(latex))
    return components.length > 0 ? new DocxMath({ children: components }) : null
  } catch {
    return null
  }
}

function convertNodes(nodes: LatexNode[]): MathComponent[] {
  const output: MathComponent[] = []
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node.type === 'whitespace') {
      output.push(new MathRun(' '))
      continue
    }
    if (node.type === 'string') {
      output.push(new MathRun(node.content))
      continue
    }
    if (node.type === 'group') {
      output.push(...convertNodes(node.content))
      continue
    }
    if (node.type === 'environment' || node.type === 'mathenv' || node.type === 'displaymath' || node.type === 'inlinemath') {
      throw new Error('Unsupported math environment')
    }
    if (node.type !== 'macro') throw new Error('Unsupported LaTeX node')

    const name = node.content
    if (name === '^' || name === '_') {
      const base = output.pop()
      if (!base) throw new Error('Script without a base')
      const first = convertArgument(node.args?.[0])
      const paired = nodes[index + 1]
      if (paired?.type === 'macro' && ((name === '^' && paired.content === '_') || (name === '_' && paired.content === '^'))) {
        const second = convertArgument(paired.args?.[0])
        output.push(new MathSubSuperScript({ children: [base], subScript: name === '_' ? first : second, superScript: name === '^' ? first : second }))
        index += 1
      } else if (name === '^') output.push(new MathSuperScript({ children: [base], superScript: first }))
      else output.push(new MathSubScript({ children: [base], subScript: first }))
      continue
    }
    if (name === 'frac') {
      output.push(new MathFraction({ numerator: convertArgument(node.args?.[0]), denominator: convertArgument(node.args?.[1]) }))
      continue
    }
    if (name === 'sqrt') {
      output.push(new MathRadical({ children: convertArgument(node.args?.[1] ?? node.args?.[0]), degree: node.args?.[0]?.content.length ? convertArgument(node.args[0]) : undefined }))
      continue
    }
    if (name === 'sum' || name === 'int') {
      let subScript: MathComponent[] | undefined
      let superScript: MathComponent[] | undefined
      while (true) {
        const script = nodes[index + 1]
        if (script?.type !== 'macro' || (script.content !== '_' && script.content !== '^')) break
        if (script.content === '_') subScript = convertArgument(script.args?.[0])
        else superScript = convertArgument(script.args?.[0])
        index += 1
      }
      output.push(name === 'sum'
        ? new MathSum({ children: [new MathRun('')], subScript, superScript })
        : new MathIntegral({ children: [new MathRun('')], subScript, superScript }))
      continue
    }
    if (name === 'left') {
      const delimiter = nodes[index + 1]
      const rightIndex = findRightDelimiter(nodes, index + 2)
      if (!delimiter || rightIndex < 0) throw new Error('Unmatched delimiter')
      const children = convertNodes(nodes.slice(index + 2, rightIndex))
      const character = nodeText(delimiter)
      output.push(wrapBrackets(character, children))
      index = rightIndex + 1
      continue
    }
    if (name === 'text' || name === 'mathrm' || name === 'mathbf' || name === 'mathit') {
      output.push(...convertArgument(node.args?.[0]))
      continue
    }
    if (functions.has(name)) {
      output.push(new MathFunction({ name: [new MathRun(name)], children: [new MathRun('')] }))
      continue
    }
    if (symbols[name]) {
      output.push(new MathRun(symbols[name]))
      continue
    }
    if (name === ',' || name === ';' || name === 'quad' || name === 'qquad') {
      output.push(new MathRun(name === 'qquad' ? '    ' : name === 'quad' ? '  ' : ' '))
      continue
    }
    throw new Error(`Unsupported macro: ${name}`)
  }
  return output
}

function convertArgument(argument: { content: LatexNode[] } | undefined): MathComponent[] {
  if (!argument) throw new Error('Missing argument')
  return convertNodes(argument.content)
}

function findRightDelimiter(nodes: LatexNode[], start: number): number {
  let depth = 0
  for (let index = start; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node.type === 'macro' && node.content === 'left') depth += 1
    if (node.type === 'macro' && node.content === 'right') {
      if (depth === 0) return index
      depth -= 1
    }
  }
  return -1
}

function nodeText(node: LatexNode): string {
  if (node.type === 'string') return node.content
  if (node.type === 'macro') return node.content
  return ''
}

function wrapBrackets(delimiter: string, children: MathComponent[]): MathComponent {
  if (delimiter === '[') return new MathSquareBrackets({ children })
  if (delimiter === '{' || delimiter === 'lbrace') return new MathCurlyBrackets({ children })
  if (delimiter === '<' || delimiter === 'langle') return new MathAngledBrackets({ children })
  return new MathRoundBrackets({ children })
}
