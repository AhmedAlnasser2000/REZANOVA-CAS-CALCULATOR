import { ComputeEngine } from '@cortex-js/compute-engine';
import { normalizeExactScalar } from './scalars';
import type { ExactPolynomial, ExactScalar } from './types';

const ce = new ComputeEngine();

export function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

export function isExactIntegerNode(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node) && Number.isInteger(node);
}

export function buildExactScalarNode(value: ExactScalar): unknown {
  const normalized = normalizeExactScalar(value);
  if (normalized.denominator === 1) {
    return normalized.numerator;
  }

  return ['Rational', normalized.numerator, normalized.denominator];
}

export function readExactScalarNode(node: unknown): ExactScalar | null {
  if (isExactIntegerNode(node)) {
    return { numerator: node, denominator: 1 };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  if (
    node[0] === 'Rational'
    && node.length === 3
    && isExactIntegerNode(node[1])
    && isExactIntegerNode(node[2])
  ) {
    return normalizeExactScalar({ numerator: node[1], denominator: node[2] });
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = readExactScalarNode(node[1]);
    return child
      ? { numerator: -child.numerator, denominator: child.denominator }
      : null;
  }

  return null;
}

function buildMonomialNode(variable: string, degree: number) {
  if (degree === 0) {
    return 1;
  }

  if (degree === 1) {
    return variable;
  }

  return ['Power', variable, degree];
}

function buildTermNode(variable: string, degree: number, coefficient: ExactScalar) {
  if (degree === 0) {
    return buildExactScalarNode(coefficient);
  }

  const variableNode = buildMonomialNode(variable, degree);
  const normalized = normalizeExactScalar(coefficient);
  if (normalized.numerator === 1 && normalized.denominator === 1) {
    return variableNode;
  }

  if (normalized.numerator === -1 && normalized.denominator === 1) {
    return ['Negate', variableNode];
  }

  return ['Multiply', buildExactScalarNode(normalized), variableNode];
}

export function exactPolynomialToNode(polynomial: ExactPolynomial): unknown {
  const entries = [...polynomial.terms.entries()]
    .filter(([, coefficient]) => coefficient.numerator !== 0)
    .sort((left, right) => right[0] - left[0]);

  if (entries.length === 0) {
    return 0;
  }

  const nodes = entries.map(([degree, coefficient]) =>
    buildTermNode(polynomial.variable, degree, coefficient));

  return nodes.length === 1 ? nodes[0] : ['Add', ...nodes];
}

export function exactPolynomialToLatex(polynomial: ExactPolynomial) {
  return ce.box(exactPolynomialToNode(polynomial) as Parameters<typeof ce.box>[0]).latex;
}

