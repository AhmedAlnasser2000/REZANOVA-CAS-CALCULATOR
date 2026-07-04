import { ComputeEngine } from '@cortex-js/compute-engine';
import { readExactScalarNode } from '../../algebra/polynomial-core';
import { dependsOnVariable, flattenMultiply, isNodeArray } from '../patterns';
import { multiplyGeneratedLatexByNode, negateGeneratedLatex } from './generated-latex';
import { symbolicSuccess } from './metadata';
import type { IntegralResolution } from './types';
import type { DisplayDetailSection } from '../../../types/calculator';

const ce = new ComputeEngine();

export type ScalarMultipleSplit = {
  coefficient: unknown;
  body: unknown;
};

function productFactorsWithNegation(node: unknown): unknown[] {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return [-1, ...productFactorsWithNegation(node[1])];
  }

  return isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
}

function multiplyNodes(factors: unknown[]) {
  const meaningful = factors.filter((factor) => {
    const scalar = readExactScalarNode(factor);
    return !scalar || scalar.numerator !== scalar.denominator;
  });

  if (meaningful.length === 0) {
    return 1;
  }

  return meaningful.length === 1 ? meaningful[0] : ['Multiply', ...meaningful];
}

function targetFree(node: unknown, variable: string) {
  return !dependsOnVariable(node, variable);
}

export function splitScalarMultiple(
  node: unknown,
  variable: string,
): ScalarMultipleSplit | undefined {
  if (!isNodeArray(node) || (node[0] !== 'Multiply' && node[0] !== 'Negate')) {
    return undefined;
  }

  const coefficientFactors: unknown[] = [];
  const bodyFactors: unknown[] = [];
  for (const factor of productFactorsWithNegation(node)) {
    if (targetFree(factor, variable)) {
      coefficientFactors.push(factor);
    } else {
      bodyFactors.push(factor);
    }
  }

  if (coefficientFactors.length === 0 || bodyFactors.length !== 1) {
    return undefined;
  }

  const coefficient = multiplyNodes(coefficientFactors);
  const scalar = readExactScalarNode(coefficient);
  if (scalar && scalar.numerator === scalar.denominator) {
    return undefined;
  }

  return {
    coefficient,
    body: bodyFactors[0],
  };
}

function scalarMultipleDetail(
  coefficient: unknown,
  body: unknown,
): DisplayDetailSection {
  return {
    title: 'Integration Scalar Multiple',
    lines: [
      `Factored coefficient: ${ce.box(coefficient as Parameters<typeof ce.box>[0]).latex}`,
      `Integrated factor: ${ce.box(body as Parameters<typeof ce.box>[0]).latex}`,
      'Scaled the factor primitive and backchecked the result against the original integrand.',
    ],
  };
}

function scalePrimitiveLatex(coefficient: unknown, latex: string) {
  const scalar = readExactScalarNode(coefficient);
  if (scalar && scalar.numerator === -scalar.denominator) {
    return negateGeneratedLatex(latex);
  }

  if (scalar && scalar.numerator === scalar.denominator) {
    return latex;
  }

  return multiplyGeneratedLatexByNode(coefficient, latex);
}

export function finishScalarMultipleRetry(
  node: unknown,
  variable: string,
  split: ScalarMultipleSplit,
  retried: Extract<IntegralResolution, { kind: 'success' }>,
): IntegralResolution | undefined {
  const exactLatex = scalePrimitiveLatex(split.coefficient, retried.exactLatex);
  const checked = symbolicSuccess(
    node,
    variable,
    exactLatex,
    retried.strategy,
    undefined,
    retried.exactSupplementLatex,
    [
      scalarMultipleDetail(split.coefficient, split.body),
      ...(retried.detailSections ?? []),
    ],
  );

  return checked.kind === 'success' && checked.verification.status === 'verified-exact'
    ? checked
    : undefined;
}
