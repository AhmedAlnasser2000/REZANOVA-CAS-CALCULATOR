import { ComputeEngine } from '@cortex-js/compute-engine';

const ce = new ComputeEngine();

export type FactorMap = Map<string, { node: unknown; exponent: number }>;
export type AffineForm = {
  a: number;
  b: number;
  latex: string;
};

export type PolynomialTerm = {
  degree: number;
  coefficient: number;
};

export function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

export function isFiniteNumber(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node);
}

export function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

export function wrapGroupedLatex(latex: string) {
  return /^[-+]?\w+(?:\^\{?[-+]?\d+\}?)?$/.test(latex) ? latex : `\\left(${latex}\\right)`;
}

export function multiplyLatex(left: string, right: string) {
  if (left === '1') {
    return right;
  }

  if (left === '-1') {
    return `-${wrapGroupedLatex(right)}`;
  }

  return `${left}${wrapGroupedLatex(right)}`;
}

export function divideByNumericCoefficient(numeratorLatex: string, denominator: number) {
  if (denominator === 1) {
    return numeratorLatex;
  }

  if (denominator === -1) {
    return `-${wrapGroupedLatex(numeratorLatex)}`;
  }

  return `\\frac{${numeratorLatex}}{${boxLatex(denominator)}}`;
}

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

export function addTerms(terms: unknown[]) {
  if (terms.length === 0) {
    return 0;
  }

  if (terms.length === 1) {
    return terms[0];
  }

  return ['Add', ...terms];
}

export function numericConstant(node: unknown): number | undefined {
  if (isFiniteNumber(node)) {
    return node;
  }

  if (!isNodeArray(node)) {
    return undefined;
  }

  if (node[0] === 'Multiply') {
    let product = 1;
    for (const factor of node.slice(1)) {
      const numeric = numericConstant(factor);
      if (numeric === undefined) {
        return undefined;
      }
      product *= numeric;
    }
    return product;
  }

  return undefined;
}

export function parseLinearTerm(node: unknown, variable: string) {
  if (node === variable) {
    return 1;
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply' || node.length !== 3) {
    return undefined;
  }

  const [, left, right] = node;
  if (left === variable && isFiniteNumber(right)) {
    return right;
  }

  if (right === variable && isFiniteNumber(left)) {
    return left;
  }

  return undefined;
}

export function parseAffine(node: unknown, variable: string): AffineForm | undefined {
  if (node === variable) {
    return { a: 1, b: 0, latex: variable };
  }

  const linear = parseLinearTerm(node, variable);
  if (linear !== undefined) {
    return { a: linear, b: 0, latex: boxLatex(node) };
  }

  if (!isNodeArray(node) || node[0] !== 'Add' || node.length !== 3) {
    return undefined;
  }

  const left = node[1];
  const right = node[2];
  if (isFiniteNumber(left)) {
    const affine = parseAffine(right, variable);
    return affine
      ? { a: affine.a, b: affine.b + left, latex: boxLatex(node) }
      : undefined;
  }

  if (isFiniteNumber(right)) {
    const affine = parseAffine(left, variable);
    return affine
      ? { a: affine.a, b: affine.b + right, latex: boxLatex(node) }
      : undefined;
  }

  return undefined;
}

export function polynomialTerms(node: unknown, variable: string): Map<number, number> | undefined {
  if (!dependsOnVariable(node, variable)) {
    const constant = numericConstant(node);
    return constant === undefined ? undefined : new Map([[0, constant]]);
  }

  if (node === variable) {
    return new Map([[1, 1]]);
  }

  if (isNodeArray(node) && node[0] === 'Add') {
    const result = new Map<number, number>();
    for (const term of node.slice(1)) {
      const partial = polynomialTerms(term, variable);
      if (!partial) {
        return undefined;
      }

      for (const [degree, coefficient] of partial.entries()) {
        result.set(degree, (result.get(degree) ?? 0) + coefficient);
      }
    }

    return result;
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    let coefficient = 1;
    let degree = 0;

    for (const factor of node.slice(1)) {
      if (!dependsOnVariable(factor, variable)) {
        const numeric = numericConstant(factor);
        if (numeric === undefined) {
          return undefined;
        }
        coefficient *= numeric;
        continue;
      }

      if (factor === variable) {
        degree += 1;
        continue;
      }

      if (
        isNodeArray(factor)
        && factor[0] === 'Power'
        && factor.length === 3
        && factor[1] === variable
        && isFiniteNumber(factor[2])
        && Number.isInteger(factor[2])
      ) {
        degree += factor[2];
        continue;
      }

      return undefined;
    }

    return new Map([[degree, coefficient]]);
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === variable
    && isFiniteNumber(node[2])
    && Number.isInteger(node[2])
  ) {
    return new Map([[node[2], 1]]);
  }

  return undefined;
}

export function toPolynomialTerms(node: unknown, variable: string): PolynomialTerm[] | undefined {
  const terms = polynomialTerms(node, variable);
  if (!terms) {
    return undefined;
  }

  return [...terms.entries()]
    .filter(([, coefficient]) => Math.abs(coefficient) > 1e-10)
    .map(([degree, coefficient]) => ({ degree, coefficient }))
    .sort((left, right) => right.degree - left.degree);
}
