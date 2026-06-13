import { ComputeEngine } from '@cortex-js/compute-engine';

export type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export const ZERO: MathJson = 0;
export const ONE: MathJson = 1;

const ce = new ComputeEngine();

export function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

export function isZeroNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, 0);
}

export function isOneNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, 1);
}

export function isNegativeOneNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, -1);
}

export function hasTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }

  if (isArrayNode(node)) {
    return node.some((entry) => hasTarget(entry, target));
  }

  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => hasTarget(entry, target));
  }

  return false;
}

export function flattenOperator(operator: string, nodes: MathJson[]) {
  return nodes.flatMap((node) =>
    isArrayNode(node) && node[0] === operator
      ? node.slice(1) as MathJson[]
      : [node],
  );
}

export function simplifyNode(node: MathJson): MathJson {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().json as MathJson;
  } catch {
    return node;
  }
}

export function createArithmeticHelpers(
  simplify: (node: MathJson) => MathJson = simplifyNode,
) {
  function addNodes(...nodes: MathJson[]): MathJson {
    const terms = flattenOperator('Add', nodes).filter((node) => !isZeroNode(node));
    if (terms.length === 0) {
      return ZERO;
    }
    if (terms.length === 1) {
      return terms[0];
    }
    return simplify(['Add', ...terms] as MathJson);
  }

  function multiplyNodes(...nodes: MathJson[]): MathJson {
    const factors = flattenOperator('Multiply', nodes).filter((node) => !isOneNode(node));
    if (factors.some((node) => isZeroNode(node))) {
      return ZERO;
    }
    if (factors.length === 0) {
      return ONE;
    }
    if (factors.length === 1) {
      return factors[0];
    }
    return simplify(['Multiply', ...factors] as MathJson);
  }

  function negateNode(node: MathJson): MathJson {
    if (typeof node === 'number') {
      return -node as MathJson;
    }
    if (isArrayNode(node) && node[0] === 'Negate') {
      return node[1] as MathJson;
    }
    if (isArrayNode(node) && node[0] === 'Add') {
      return addNodes(...node.slice(1).map((term) => negateNode(term as MathJson)));
    }
    return simplify(['Negate', node] as MathJson);
  }

  function subtractNodes(left: MathJson, right: MathJson) {
    return addNodes(left, negateNode(right));
  }

  function divideNodes(numerator: MathJson, denominator: MathJson): MathJson {
    if (isOneNode(denominator)) {
      return numerator;
    }
    if (isNegativeOneNode(denominator)) {
      return negateNode(numerator);
    }
    return simplify(['Divide', numerator, denominator] as MathJson);
  }

  function squareNode(node: MathJson): MathJson {
    return simplify(['Power', node, 2] as MathJson);
  }

  return {
    addNodes,
    divideNodes,
    multiplyNodes,
    negateNode,
    squareNode,
    subtractNodes,
  };
}

export function latexForNode(node: MathJson) {
  return ce.box(simplifyNode(node) as Parameters<typeof ce.box>[0]).latex;
}

export function numericFromNode(node: unknown): number | null {
  if (typeof node === 'number') {
    return node;
  }
  if (
    isArrayNode(node)
    && node[0] === 'Rational'
    && typeof node[1] === 'number'
    && typeof node[2] === 'number'
    && node[2] !== 0
  ) {
    return node[1] / node[2];
  }
  return null;
}
