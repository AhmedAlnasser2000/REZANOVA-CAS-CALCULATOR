import {
  buildExactScalarNode,
  normalizeExactScalar,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { normalizeAst } from '../normalize';
import { boxLatex, flattenMultiply, isNodeArray } from '../patterns';

export type IntegrationNormalForm = {
  node: unknown;
  changed: boolean;
  lines: string[];
};

type NormalizedNode = {
  node: unknown;
  changed: boolean;
  steps: string[];
};

function exact(numerator: number, denominator = 1): ExactScalar {
  return normalizeExactScalar({ numerator, denominator });
}

function scalarNode(numerator: number, denominator = 1) {
  return buildExactScalarNode(exact(numerator, denominator));
}

function negateScalarNode(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar
    ? buildExactScalarNode({ numerator: -scalar.numerator, denominator: scalar.denominator })
    : ['Negate', node];
}

function powerNode(base: unknown, exponent: unknown): unknown {
  const scalar = readExactScalarNode(exponent);
  if (scalar?.numerator === 1 && scalar.denominator === 1) {
    return base;
  }
  if (scalar?.numerator === 0) {
    return 1;
  }
  return ['Power', base, exponent];
}

function multiplyNodes(nodes: unknown[]) {
  const meaningful = nodes.flatMap((node) =>
    isNodeArray(node) && node[0] === 'Multiply' ? flattenMultiply(node) : [node],
  ).filter((node) => {
    const scalar = readExactScalarNode(node);
    return !scalar || scalar.numerator !== scalar.denominator;
  });

  if (meaningful.length === 0) {
    return 1;
  }
  return meaningful.length === 1 ? meaningful[0] : normalizeAst(['Multiply', ...meaningful]);
}

function reciprocalNode(node: unknown): unknown {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return scalarNode(scalar.denominator, scalar.numerator);
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    return multiplyNodes(flattenMultiply(node).map(reciprocalNode));
  }

  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    return powerNode(node[1], negateScalarNode(node[2]));
  }

  return ['Power', node, -1];
}

function normalizeNode(node: unknown): NormalizedNode {
  if (!isNodeArray(node) || node.length === 0) {
    return { node, changed: false, steps: [] };
  }

  const [head, ...children] = node;
  const normalizedChildren = children.map(normalizeNode);
  const rebuiltChildren = normalizedChildren.map((child) => child.node);
  const childChanged = normalizedChildren.some((child) => child.changed);
  const childSteps = normalizedChildren.flatMap((child) => child.steps);

  if (head === 'Sqrt' && rebuiltChildren.length === 1) {
    return {
      node: powerNode(rebuiltChildren[0], scalarNode(1, 2)),
      changed: true,
      steps: [...childSteps, 'square roots -> exponent 1/2'],
    };
  }

  if (head === 'Root' && rebuiltChildren.length === 2) {
    const degree = readExactScalarNode(rebuiltChildren[1]);
    if (degree && degree.denominator === 1 && degree.numerator !== 0) {
      return {
        node: powerNode(rebuiltChildren[0], scalarNode(1, degree.numerator)),
        changed: true,
        steps: [...childSteps, 'n-th roots -> exponent 1/n'],
      };
    }
  }

  if (head === 'Divide' && rebuiltChildren.length === 2) {
    if (!childChanged) {
      return { node, changed: false, steps: [] };
    }

    return {
      node: multiplyNodes([rebuiltChildren[0], reciprocalNode(rebuiltChildren[1])]),
      changed: true,
      steps: [...childSteps, 'rewritten quotients -> reciprocal powers'],
    };
  }

  return {
    node: childChanged ? normalizeAst([head, ...rebuiltChildren]) : node,
    changed: childChanged,
    steps: childChanged ? childSteps : [],
  };
}

export function normalizeIntegrationNormalForm(node: unknown): IntegrationNormalForm {
  const normalized = normalizeNode(node);
  if (!normalized.changed) {
    return { node, changed: false, lines: [] };
  }

  return {
    node: normalizeAst(normalized.node),
    changed: true,
    lines: [
      `Original integrand: ${boxLatex(node)}`,
      `Recognized rewrites: ${Array.from(new Set(normalized.steps)).join('; ')}`,
      `Internal retry form: ${boxLatex(normalizeAst(normalized.node))}`,
      'Existing integration routes must still accept and backcheck the retried form before adoption.',
    ],
  };
}
