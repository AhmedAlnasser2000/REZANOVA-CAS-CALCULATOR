import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import {
  buildExactScalarNode,
  divideExactScalars,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  quadraticDiscriminant,
  type ExactScalar,
} from '../polynomial-core';
import { factorBoundedPolynomialAst } from '../polynomial-factor-solve';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { termKey } from '../../symbolic-engine/patterns';
import {
  detectSingleVariable,
  exactScalarEquals,
  exactScalarIsZero,
  simplifyNode,
} from './math-json';
import type { PerfectSquareRadicandProfile } from './types';

const ce = new ComputeEngine();

function isPerfectSquareInteger(value: number) {
  if (!Number.isInteger(value) || value < 0) {
    return null;
  }

  const root = Math.sqrt(value);
  return Number.isInteger(root) ? root : null;
}

function squareRootExactScalar(value: ExactScalar): ExactScalar | null {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator < 0) {
    return null;
  }

  const numeratorRoot = isPerfectSquareInteger(normalized.numerator);
  const denominatorRoot = isPerfectSquareInteger(normalized.denominator);
  if (numeratorRoot === null || denominatorRoot === null) {
    return null;
  }

  return normalizeExactScalar({
    numerator: numeratorRoot,
    denominator: denominatorRoot,
  });
}

function buildAbsAffineNode(variable: string, root: ExactScalar) {
  const scaledVariable = root.denominator === 1
    ? variable
    : simplifyNode(['Multiply', root.denominator, variable]);
  const integerOffset = buildExactScalarNode({ numerator: root.numerator, denominator: 1 });
  const affineNode = simplifyNode(['Add', scaledVariable, ['Negate', integerOffset]]);
  return ['Abs', affineNode];
}

export function recognizePerfectSquareRadicand(
  radicand: unknown,
): PerfectSquareRadicandProfile | null {
  const variable = detectSingleVariable(radicand);
  if (variable === null || !variable) {
    return null;
  }

  let expanded = normalizeAst(radicand);
  try {
    expanded = normalizeAst((expand(ce.box(expanded as Parameters<typeof ce.box>[0]) as never) as { json: unknown }).json);
  } catch {
    expanded = normalizeAst(radicand);
  }

  const polynomial = parseExactPolynomial(expanded, variable, 2);
  if (polynomial) {
    const discriminant = quadraticDiscriminant(polynomial);
    if (!discriminant || !exactScalarIsZero(discriminant)) {
      return null;
    }

    const leading = getExactPolynomialCoefficient(polynomial, 2);
    const sqrtLeading = squareRootExactScalar(leading);
    if (!sqrtLeading) {
      return null;
    }

    const b = getExactPolynomialCoefficient(polynomial, 1);
    const denominator = multiplyExactScalars(leading, { numerator: 2, denominator: 1 });
    const root = divideExactScalars(negateExactScalar(b), denominator);
    if (!root) {
      return null;
    }

    const outsideScalar = divideExactScalars(
      sqrtLeading,
      { numerator: root.denominator, denominator: 1 },
    );
    if (!outsideScalar) {
      return null;
    }

    const absInnerNode = buildAbsAffineNode(variable, root);
    const normalizedNode = exactScalarEquals(outsideScalar, { numerator: 1, denominator: 1 })
      ? absInnerNode
      : simplifyNode(['Multiply', buildExactScalarNode(outsideScalar), absInnerNode]);

    return {
      outsideScalar,
      absInnerNode,
      normalizedNode,
    };
  }

  const boundedFactorization = factorBoundedPolynomialAst(expanded, variable);
  if (
    !boundedFactorization
    || boundedFactorization.factors.length !== 1
    || boundedFactorization.factors[0].degree !== 2
    || boundedFactorization.factors[0].multiplicity !== 2
  ) {
    return null;
  }

  const outsideScalar = squareRootExactScalar(boundedFactorization.scalar);
  if (!outsideScalar) {
    return null;
  }

  const absInnerNode = ['Abs', boundedFactorization.factors[0].node];
  const normalizedNode = exactScalarEquals(outsideScalar, { numerator: 1, denominator: 1 })
    ? absInnerNode
    : simplifyNode(['Multiply', buildExactScalarNode(outsideScalar), absInnerNode]);

  return {
    outsideScalar,
    absInnerNode,
    normalizedNode,
  };
}

export function radicalNodeKey(node: unknown) {
  return termKey(normalizeAst(node));
}
