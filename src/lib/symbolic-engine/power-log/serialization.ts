import type { SolveDomainConstraint } from '../../../types/calculator';
import { boxLatex, compactRepeatedProductFactors, isNodeArray, wrapGroupedLatex } from '../patterns';
import { normalizeAst } from '../normalize';
import type { SerializedNode } from './types';
import { mergeConstraints } from './constraints';
import { isExponentialE, readNumericConstant } from './scalars';

const RELATION_LATEX: Record<string, string> = {
  Equal: '=',
  NotEqual: '\\ne',
  Less: '<',
  LessEqual: '\\le',
  Greater: '>',
  GreaterEqual: '\\ge',
};

function wrapPowerBaseLatex(latex: string, node: unknown) {
  if (typeof node === 'string' || typeof node === 'number') {
    return latex;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return latex;
  }

  const head = node[0];
  return head === 'Sqrt' || head === 'Root' || head === 'Ln' || head === 'Log'
    ? latex
    : wrapGroupedLatex(latex);
}

function wrapAdditiveTerm(latex: string, node: unknown) {
  if (!isNodeArray(node) || node.length === 0) {
    return latex;
  }

  const head = node[0];
  return head === 'Add' || head === 'Equal' || head === 'NotEqual' || head === 'Less' || head === 'LessEqual' || head === 'Greater' || head === 'GreaterEqual'
    ? `\\left(${latex}\\right)`
    : latex;
}

function combineAdditiveLatex(children: Array<{ node: unknown; render: SerializedNode }>) {
  const [first, ...rest] = children;
  let latex = first.render.latex;

  for (const child of rest) {
    const childNode = child.node;
    if (isNodeArray(childNode) && childNode[0] === 'Negate' && childNode.length === 2) {
      latex += `-${wrapAdditiveTerm(child.render.latex.slice(1), childNode[1])}`;
      continue;
    }

    if (typeof childNode === 'number' && childNode < 0) {
      latex += `-${boxLatex(Math.abs(childNode))}`;
      continue;
    }

    latex += `+${child.render.latex}`;
  }

  return latex;
}

function reorderAddChildren(children: Array<{ node: unknown; latex: string }>) {
  if (children.length !== 2) {
    return children;
  }

  const [first, second] = children;
  if (typeof first.node === 'number' && first.node >= 0 && typeof second.node !== 'number') {
    return [second, first];
  }

  return children;
}

export function serializeNode(node: unknown): string {
  if (typeof node === 'string') {
    return node === 'ExponentialE' ? 'e' : boxLatex(node);
  }

  if (typeof node === 'number') {
    return boxLatex(node);
  }

  if (!isNodeArray(node) || node.length === 0) {
    return boxLatex(node);
  }

  const compactedProduct = compactRepeatedProductFactors(node);
  if (compactedProduct !== node) {
    return serializeNode(compactedProduct);
  }

  const [head, ...children] = node;
  const renderedChildren = children.map((child) => ({
    node: child,
    latex: serializeNode(child),
  }));

  switch (head) {
    case 'Equal':
    case 'NotEqual':
    case 'Less':
    case 'LessEqual':
    case 'Greater':
    case 'GreaterEqual':
      if (renderedChildren.length === 2) {
        return `${renderedChildren[0].latex}${RELATION_LATEX[head]}${renderedChildren[1].latex}`;
      }
      break;
    case 'Add':
      if (renderedChildren.length > 0) {
        return combineAdditiveLatex(reorderAddChildren(renderedChildren).map((child) => ({
          node: child.node,
          render: {
            node: child.node,
            latex: child.latex,
            changed: false,
            handled: false,
            conditionConstraints: [],
            containsTrackedNotation: false,
          },
        })));
      }
      break;
    case 'Multiply':
      if (renderedChildren.length > 0) {
        return renderedChildren
          .map((child) => wrapAdditiveTerm(child.latex, child.node))
          .join('');
      }
      break;
    case 'Divide':
      if (renderedChildren.length === 2) {
        return `\\frac{${renderedChildren[0].latex}}{${renderedChildren[1].latex}}`;
      }
      break;
    case 'Negate':
      if (renderedChildren.length === 1) {
        return `-${wrapAdditiveTerm(renderedChildren[0].latex, renderedChildren[0].node)}`;
      }
      break;
    case 'Power':
      if (children.length === 2) {
        if (isExponentialE(children[0])) {
          return `e^{${renderedChildren[1].latex}}`;
        }
        return `${wrapPowerBaseLatex(renderedChildren[0].latex, children[0])}^{${renderedChildren[1].latex}}`;
      }
      break;
    case 'Sqrt':
      if (renderedChildren.length === 1) {
        return `\\sqrt{${renderedChildren[0].latex}}`;
      }
      break;
    case 'Root':
      if (renderedChildren.length === 2) {
        return `\\sqrt[${renderedChildren[1].latex}]{${renderedChildren[0].latex}}`;
      }
      break;
    case 'Ln':
      if (renderedChildren.length === 1) {
        return `\\ln\\left(${renderedChildren[0].latex}\\right)`;
      }
      break;
    case 'Log':
      if (renderedChildren.length === 1) {
        return `\\log\\left(${renderedChildren[0].latex}\\right)`;
      }
      if (renderedChildren.length === 2) {
        if (isExponentialE(children[1])) {
          return `\\ln\\left(${renderedChildren[0].latex}\\right)`;
        }
        if (readNumericConstant(children[1]) === 10) {
          return `\\log\\left(${renderedChildren[0].latex}\\right)`;
        }
        return `\\log_{${renderedChildren[1].latex}}\\left(${renderedChildren[0].latex}\\right)`;
      }
      break;
    default:
      break;
  }

  return boxLatex(node);
}

export function serializeRebuiltNode(
  original: unknown,
  children: SerializedNode[],
): SerializedNode {
  if (!isNodeArray(original) || original.length === 0) {
    return {
      node: original,
      latex: serializeNode(original),
      changed: false,
      handled: false,
      conditionConstraints: [],
      containsTrackedNotation: false,
    };
  }

  const rebuilt = normalizeAst([original[0], ...children.map((child) => child.node)]);
  const conditionConstraints = children.reduce<SolveDomainConstraint[]>(
    (current, child) => mergeConstraints(current, child.conditionConstraints),
    [],
  );
  const containsTrackedNotation =
    (isNodeArray(rebuilt)
      && (rebuilt[0] === 'Ln'
        || rebuilt[0] === 'Log'
        || (rebuilt[0] === 'Power' && rebuilt.length === 3 && isExponentialE(rebuilt[1]))))
    || children.some((child) => child.containsTrackedNotation);

  return {
    node: rebuilt,
    latex: serializeNode(rebuilt),
    changed: children.some((child) => child.changed),
    handled: children.some((child) => child.handled),
    conditionConstraints,
    containsTrackedNotation,
  };
}
