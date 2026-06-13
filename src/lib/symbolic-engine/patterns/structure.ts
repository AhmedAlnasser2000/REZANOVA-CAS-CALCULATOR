import { isFiniteNumber, isNodeArray } from './guards';

export type FactorMap = Map<string, { node: unknown; exponent: number }>;

export function termKey(node: unknown) {
  return JSON.stringify(node);
}

export function dependsOnVariable(node: unknown, variable: string): boolean {
  if (node === variable) {
    return true;
  }

  if (!isNodeArray(node)) {
    return false;
  }

  return node.some((child, index) => index > 0 && dependsOnVariable(child, variable));
}

export function flattenAdd(node: unknown): unknown[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return node.slice(1).flatMap(flattenAdd);
  }

  return [node];
}

export function flattenMultiply(node: unknown): unknown[] {
  if (isNodeArray(node) && node[0] === 'Multiply') {
    return node.slice(1).flatMap(flattenMultiply);
  }

  return [node];
}

export function mergeFactor(map: FactorMap, node: unknown, exponent = 1) {
  const key = termKey(node);
  const current = map.get(key);
  map.set(key, {
    node,
    exponent: (current?.exponent ?? 0) + exponent,
  });
}

export function decomposeProduct(node: unknown): { coefficient: number; factors: FactorMap } | null {
  if (typeof node === 'number') {
    return { coefficient: node, factors: new Map() };
  }

  if (typeof node === 'string') {
    const factors = new Map<string, { node: unknown; exponent: number }>();
    mergeFactor(factors, node);
    return { coefficient: 1, factors };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  const [operator, ...children] = node;
  if (operator === 'Negate' && children.length === 1) {
    const decomposed = decomposeProduct(children[0]);
    return decomposed
      ? { coefficient: -decomposed.coefficient, factors: decomposed.factors }
      : null;
  }

  if (operator === 'Multiply') {
    let coefficient = 1;
    const factors = new Map<string, { node: unknown; exponent: number }>();

    for (const child of children) {
      const decomposed = decomposeProduct(child);
      if (!decomposed) {
        return null;
      }

      coefficient *= decomposed.coefficient;
      for (const entry of decomposed.factors.values()) {
        mergeFactor(factors, entry.node, entry.exponent);
      }
    }

    return { coefficient, factors };
  }

  if (
    operator === 'Power'
    && children.length === 2
    && isFiniteNumber(children[1])
    && Number.isInteger(children[1])
    && children[1] > 0
  ) {
    const factors = new Map<string, { node: unknown; exponent: number }>();
    mergeFactor(factors, children[0], children[1]);
    return { coefficient: 1, factors };
  }

  const factors = new Map<string, { node: unknown; exponent: number }>();
  mergeFactor(factors, node);
  return { coefficient: 1, factors };
}

export function buildFactorNode(factors: FactorMap) {
  const nodes: unknown[] = [];
  for (const { node, exponent } of factors.values()) {
    nodes.push(exponent === 1 ? node : ['Power', node, exponent]);
  }

  if (nodes.length === 0) {
    return undefined;
  }

  if (nodes.length === 1) {
    return nodes[0];
  }

  return ['Multiply', ...nodes];
}

export function buildTermNode(coefficient: number, factors: FactorMap): unknown {
  const nodes: unknown[] = [];
  const factorNode = buildFactorNode(factors);

  if (factorNode) {
    if (coefficient === -1) {
      return ['Negate', factorNode];
    }

    if (coefficient !== 1) {
      nodes.push(coefficient);
    }

    nodes.push(...(isNodeArray(factorNode) && factorNode[0] === 'Multiply'
      ? factorNode.slice(1)
      : [factorNode]));

    return nodes.length === 1 ? nodes[0] : ['Multiply', ...nodes];
  }

  return coefficient;
}

export function compactRepeatedProductFactors(node: unknown): unknown {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return node;
  }

  const decomposed = decomposeProduct(node);
  if (!decomposed) {
    return node;
  }

  const rebuilt = buildTermNode(decomposed.coefficient, decomposed.factors);
  return termKey(rebuilt) === termKey(node) ? node : rebuilt;
}

export function addTerms(terms: unknown[]) {
  if (terms.length === 0) {
    return 0;
  }

  if (terms.length === 1) {
    return terms[0];
  }

  return ['Add', ...terms];
}
