import { boxLatex, isNodeArray } from '../patterns';
import { normalizeAst } from '../normalize';
import type { SerializedNode } from './types';
import { buildRootNode } from './radicals';
import { asRational, isExponentialE } from './scalars';
import { serializeNode, serializeRebuiltNode } from './serialization';

export function normalizeEquationPreprocess(node: unknown): SerializedNode {
  const normalized = normalizeAst(node);
  if (typeof normalized === 'string' || typeof normalized === 'number' || !isNodeArray(normalized) || normalized.length === 0) {
    return {
      node: normalized,
      latex: serializeNode(normalized),
      changed: false,
      handled: false,
      conditionConstraints: [],
      containsTrackedNotation: false,
    };
  }

  const [head, ...children] = normalized;
  if (head === 'Power' && children.length === 2) {
    const exponent = asRational(children[1]);
    if (
      exponent
      && exponent.numerator === 1
      && exponent.denominator > 1
      && !isExponentialE(children[0])
    ) {
      const base = normalizeEquationPreprocess(children[0]);
      const rewrittenNode = normalizeAst(buildRootNode(base.node, 1, exponent.denominator));
      return {
        node: rewrittenNode,
        latex: serializeNode(rewrittenNode),
        changed: true,
        handled: true,
        conditionConstraints: base.conditionConstraints,
        containsTrackedNotation: base.containsTrackedNotation,
      };
    }
  }

  const childResults = children.map((child) => normalizeEquationPreprocess(child));
  const rebuilt = serializeRebuiltNode(normalized, childResults);

  if (
    head === 'Log'
    || head === 'Ln'
    || head === 'Sqrt'
    || head === 'Root'
    || (head === 'Power' && children.length === 2 && isExponentialE(children[0]))
  ) {
    const targetLatex = serializeNode(rebuilt.node);
    return {
      ...rebuilt,
      latex: targetLatex,
      changed: rebuilt.changed || targetLatex !== boxLatex(normalized),
      handled: true,
      containsTrackedNotation:
        head === 'Log'
        || head === 'Ln'
        || (head === 'Power' && children.length === 2 && isExponentialE(children[0])),
    };
  }

  return rebuilt;
}
