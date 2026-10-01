import {
  defaultPtxSolverPort,
  type GraphDocumentV4,
  type GraphInequalityComparator,
  type PtxPlaneFunction,
} from '../../../lib/graphing';

// Tracing regions (PTX3): an edge readout says whether the edge belongs to
// the region, and hovering inside shows each condition with a ✓. Conditions
// are shown as readable text made from what the user typed.

export type PtxRegionEdge = { F: PtxPlaneFunction; operator: GraphInequalityComparator; text: string };
export type PtxRegion = { itemId: string; edges: PtxRegionEdge[] };

const SUPERSCRIPT: Record<string, string> = {
  0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', '+': '⁺',
};
const COMPARATOR_TEXT: Record<GraphInequalityComparator, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' };

/** MathLive LaTeX as short plain text for a readout: x^2 → x², \frac{a}{b} → a/b, \sqrt{x} → √x. */
export function graphLatexText(latex: string) {
  let text = latex.replace(/\\left|\\right/gu, '').replace(/\\[,;:!]/gu, ' ');
  for (let pass = 0; pass < 6; pass += 1) {
    const next = text
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/gu, (_, top: string, bottom: string) => `${wrap(top)}/${wrap(bottom)}`)
      .replace(/\\sqrt\{([^{}]*)\}/gu, (_, inside: string) => `√${wrap(inside)}`);
    if (next === text) break;
    text = next;
  }
  text = text
    .replace(/\^\{([0-9+-]+)\}|\^([0-9])/gu, (_, group: string | undefined, single: string | undefined) => [...(group ?? single ?? '')].map((c) => SUPERSCRIPT[c] ?? c).join(''))
    .replace(/\\(?:le|leq)(?![a-zA-Z])/gu, '≤').replace(/\\(?:ge|geq)(?![a-zA-Z])/gu, '≥')
    .replace(/\\lt(?![a-zA-Z])/gu, '<').replace(/\\gt(?![a-zA-Z])/gu, '>').replace(/\\(?:ne|neq)(?![a-zA-Z])/gu, '≠')
    .replace(/\\(?:cdot|times)(?![a-zA-Z])/gu, '·').replace(/\\pi(?![a-zA-Z])/gu, 'π').replace(/\\theta(?![a-zA-Z])/gu, 'θ')
    .replace(/\\([a-zA-Z]+)/gu, '$1')
    .replace(/[{}]/gu, '')
    .replace(/\s*([<>≤≥=])\s*/gu, ' $1 ')
    // Binary + and − get spaces (x² + y²); a sign at the start or after a bracket does not.
    .replace(/(?<=[\w.⁰¹²³⁴⁵⁶⁷⁸⁹)π θ])\s*([+-])\s*(?=\S)/gu, (_, sign: string) => ` ${sign === '-' ? '−' : '+'} `)
    .replace(/-/gu, '−')
    .replace(/\s+/gu, ' ')
    .trim();
  return text;
}

function wrap(part: string) {
  return /^[\w.]+$/u.test(part) ? part : `(${part})`;
}

/** The operands of a typed inequality chain, split at its top-level comparators (`x<y\le2` → x, y, 2). */
function operandTexts(latex: string, count: number) {
  const parts: string[] = []; let depth = 0; let current = '';
  // \le must not be the start of \left; plain < and > may be followed by anything.
  const comparator = /^(?:\\(?:leq|geq|le|ge|lt|gt)(?![a-zA-Z])|<=|>=|<|>|≤|≥)/u;
  for (let index = 0; index < latex.length;) {
    const char = latex[index]!;
    if (char === '{') depth += 1; else if (char === '}') depth -= 1;
    const match = depth === 0 ? comparator.exec(latex.slice(index)) : null;
    if (match) { parts.push(current); current = ''; index += match[0].length; continue; }
    current += char; index += 1;
  }
  parts.push(current);
  return parts.length === count ? parts.map(graphLatexText) : null;
}

/** Every visible region (inequality or chain) with its edges and their readable conditions, in drawing order. */
export function ptxRegions(document: GraphDocumentV4 | null, parameters: Readonly<Record<string, number>>): PtxRegion[] {
  const port = defaultPtxSolverPort();
  return (document?.items ?? []).flatMap((item): PtxRegion[] => {
    if (item.kind !== 'relation' || !item.visible) return [];
    const relation = item.relation;
    if (relation.kind !== 'inequality' && relation.kind !== 'chained-inequality') return [];
    const edges = port.regionEdges(relation, parameters);
    if (!edges) return [];
    const operators = relation.kind === 'inequality' ? [relation.operator] : relation.operators;
    const texts = operandTexts(item.source.sourceLatex, operators.length + 1);
    return [{ itemId: item.itemId, edges: edges.map((edge) => ({
      F: edge.F, operator: edge.operator,
      text: texts ? `${texts[edge.index]} ${COMPARATOR_TEXT[edge.operator]} ${texts[edge.index + 1]}` : `condition ${edge.index + 1}`,
    })) }];
  });
}

function holds(edge: PtxRegionEdge, x: number, y: number) {
  const value = edge.F(x, y);
  if (value === undefined) return false;
  return edge.operator === '<' ? value < 0 : edge.operator === '<=' ? value <= 0 : edge.operator === '>' ? value > 0 : value >= 0;
}

/** The top-most region containing (x, y), and the readout for it: each condition with a ✓. */
export function ptxRegionAt(regions: readonly PtxRegion[], x: number, y: number) {
  for (let index = regions.length - 1; index >= 0; index -= 1) {
    const region = regions[index]!;
    if (region.edges.every((edge) => holds(edge, x, y))) {
      return { itemId: region.itemId, text: region.edges.map((edge) => `${edge.text} ✓`).join(' · ') };
    }
  }
  return null;
}

/** "edge of y < x², not included": which condition an edge belongs to, and whether its points are in the region. */
export function ptxRegionEdgeText(edge: PtxRegionEdge) {
  const included = edge.operator === '<=' || edge.operator === '>=';
  return `edge of ${edge.text}, ${included ? 'included' : 'not included'}`;
}
