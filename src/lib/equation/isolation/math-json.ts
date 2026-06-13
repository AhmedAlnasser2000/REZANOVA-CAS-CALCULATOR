import { ComputeEngine } from '@cortex-js/compute-engine';

export type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export const ce = new ComputeEngine();
export const ZERO: MathJson = 0;
export const ONE: MathJson = 1;

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

export function isNumericNonzeroNode(node: unknown) {
  return typeof node === 'number' && !Object.is(node, 0);
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

export function flattenMultiply(nodes: MathJson[]) {
  return nodes.flatMap((node) =>
    isArrayNode(node) && (node[0] === 'Multiply' || node[0] === 'InvisibleOperator')
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

export function addNodes(...nodes: MathJson[]): MathJson {
  const terms = flattenOperator('Add', nodes).filter((node) => !isZeroNode(node));
  if (terms.length === 0) {
    return ZERO;
  }
  if (terms.length === 1) {
    return terms[0];
  }
  return simplifyNode(['Add', ...terms] as MathJson);
}

export function multiplyNodes(...nodes: MathJson[]): MathJson {
  const factors = flattenMultiply(nodes).filter((node) => !isOneNode(node));
  if (factors.some((node) => isZeroNode(node))) {
    return ZERO;
  }
  if (factors.length === 0) {
    return ONE;
  }
  if (factors.length === 1) {
    return factors[0];
  }
  return simplifyNode(['Multiply', ...factors] as MathJson);
}

export function negateNode(node: MathJson): MathJson {
  if (typeof node === 'number') {
    return isZeroNode(node) ? ZERO : -node as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Negate') {
    return node[1] as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Add') {
    return addNodes(...node.slice(1).map((term) => negateNode(term as MathJson)));
  }
  return simplifyNode(['Negate', node] as MathJson);
}

export function subtractNodes(left: MathJson, right: MathJson): MathJson {
  return addNodes(left, negateNode(right));
}

export function divideNodes(numerator: MathJson, denominator: MathJson): MathJson {
  if (isOneNode(denominator)) {
    return numerator;
  }
  if (isNegativeOneNode(denominator)) {
    return negateNode(numerator);
  }
  return simplifyNode(['Divide', numerator, denominator] as MathJson);
}

export function latexForNode(node: MathJson) {
  return ce.box(simplifyNode(node) as Parameters<typeof ce.box>[0]).latex;
}

export function equationLatex(left: MathJson, right: MathJson) {
  return `${latexForNode(left)}=${latexForNode(right)}`;
}

export function factNonzero(node: MathJson) {
  if (isNumericNonzeroNode(node) || isOneNode(node) || isNegativeOneNode(node)) {
    return null;
  }
  if (isArrayNode(node) && node[0] === 'Divide' && isOneNode(node[1])) {
    return factNonzero(node[2] as MathJson);
  }
  if (isArrayNode(node) && node[0] === 'Power' && node.length === 3 && isNegativeOneNode(node[2])) {
    return factNonzero(node[1] as MathJson);
  }
  if (isArrayNode(node) && node[0] === 'Negate' && node.length === 2) {
    return factNonzero(node[1] as MathJson);
  }
  return `${latexForNode(node)}\\ne0`;
}

export function unique(entries: string[]) {
  return [...new Set(entries.filter((entry) => entry.trim().length > 0))];
}
