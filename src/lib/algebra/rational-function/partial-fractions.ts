import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  buildExactPolynomialFromCoefficients,
  buildExactScalarNode,
  divideExactPolynomials,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialToNode,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactPolynomials,
  multiplyExactScalars,
  normalizeExactScalar,
  subtractExactScalars,
  type ExactPolynomial,
  type ExactScalar,
} from '../polynomial-core';
import { solveExactLinearSystem } from '../../linear-algebra/exact-matrix-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { buildNormalizedRationalFunction } from './arithmetic';
import {
  exactScalarKey,
  evaluatePolynomialAtScalar,
  factorDistinctLinearDenominator,
  factorSupportedRationalDenominator,
  linearFactorForRoot,
  polynomialPower,
} from './factorization';
import type {
  ExactRationalFunction,
  IrreducibleQuadraticFactor,
  LinearRationalFactor,
  PartialFractionReadinessResult,
  PartialFractionTerm,
  QuadraticPartialFractionTerm,
  RationalFactorizationResult,
  RationalPartialFractionReadinessResult,
  RationalPartialFractionReadinessTerm,
} from './types';

const ce = new ComputeEngine();

function partialFractionCoefficient(numerator: ExactPolynomial, root: ExactScalar, roots: ExactScalar[]) {
  const numeratorValue = evaluatePolynomialAtScalar(numerator, root);
  const denominatorValue = roots
    .filter((candidate) => exactScalarKey(candidate) !== exactScalarKey(root))
    .reduce<ExactScalar>((current, candidate) =>
      multiplyExactScalars(current, subtractExactScalars(root, candidate)), { numerator: 1, denominator: 1 });

  if (exactScalarIsZero(denominatorValue)) {
    return null;
  }

  return normalizeExactScalar({
    numerator: numeratorValue.numerator * denominatorValue.denominator,
    denominator: numeratorValue.denominator * denominatorValue.numerator,
  });
}

function buildPartialFractionTermNode(coefficient: ExactScalar, denominator: ExactPolynomial) {
  const denominatorNode = exactPolynomialToNode(denominator);
  if (coefficient.numerator === 1 && coefficient.denominator === 1) {
    return ['Divide', 1, denominatorNode];
  }
  return ['Divide', buildExactScalarNode(coefficient), denominatorNode];
}

export function decomposeDistinctLinearPartialFractions(
  rational: ExactRationalFunction,
): PartialFractionReadinessResult {
  const normalized = buildNormalizedRationalFunction(rational);
  if (normalized.kind === 'stop') {
    return normalized;
  }

  const { numerator, denominator, variable } = normalized.rational;
  if (exactPolynomialDegree(numerator) >= exactPolynomialDegree(denominator)) {
    return { kind: 'stop', reason: 'not-proper' };
  }

  const denominatorFactors = factorDistinctLinearDenominator(denominator);
  if (denominatorFactors.kind === 'stop') {
    return denominatorFactors;
  }

  const terms: PartialFractionTerm[] = [];
  for (const root of denominatorFactors.roots) {
    const denominatorPolynomial = linearFactorForRoot(variable, root);
    const coefficient = partialFractionCoefficient(numerator, root, denominatorFactors.roots);
    if (!coefficient) {
      return { kind: 'stop', reason: 'repeated-linear-factor' };
    }
    const node = normalizeAst(buildPartialFractionTermNode(coefficient, denominatorPolynomial));
    terms.push({
      coefficient,
      root,
      denominator: denominatorPolynomial,
      node,
      latex: ce.box(node as Parameters<typeof ce.box>[0]).latex,
    });
  }

  const reconstructedNode = terms.length === 1
    ? terms[0].node
    : normalizeAst(['Add', ...terms.map((term) => term.node)]);

  return {
    kind: 'success',
    variable,
    terms,
    reconstructedNode,
    reconstructedLatex: ce.box(reconstructedNode as Parameters<typeof ce.box>[0]).latex,
  };
}

type PartialFractionBasis =
  | {
    kind: 'linear-power';
    factor: LinearRationalFactor;
    power: number;
    basisNumerator: ExactPolynomial;
    denominator: ExactPolynomial;
  }
  | {
    kind: 'quadratic-linear';
    factor: IrreducibleQuadraticFactor;
    power: number;
    coefficientKind: 'linear' | 'constant';
    basisNumerator: ExactPolynomial;
    denominator: ExactPolynomial;
  };

function buildPartialFractionBasis(
  factorization: Extract<RationalFactorizationResult, { kind: 'success' }>,
): PartialFractionBasis[] | null {
  const basis: PartialFractionBasis[] = [];

  for (const factor of factorization.factors) {
    if (factor.kind === 'linear') {
      for (let power = 1; power <= factor.multiplicity; power += 1) {
        const denominator = polynomialPower(factor.polynomial, power);
        if (!denominator) {
          return null;
        }
        const division = divideExactPolynomials(factorization.denominator, denominator);
        if (!division || !exactPolynomialIsZero(division.remainder)) {
          return null;
        }
        basis.push({
          kind: 'linear-power',
          factor,
          power,
          denominator,
          basisNumerator: division.quotient,
        });
      }
      continue;
    }

    for (let power = 1; power <= factor.multiplicity; power += 1) {
      const denominator = polynomialPower(factor.polynomial, power);
      if (!denominator) {
        return null;
      }
      const division = divideExactPolynomials(factorization.denominator, denominator);
      if (!division || !exactPolynomialIsZero(division.remainder)) {
        return null;
      }
      const xBasis = multiplyExactPolynomials(
        buildExactPolynomialFromCoefficients(factorization.variable, [
          { numerator: 1, denominator: 1 },
          { numerator: 0, denominator: 1 },
        ]),
        division.quotient,
        exactPolynomialDegree(factorization.denominator),
      );
      if (!xBasis) {
        return null;
      }
      basis.push({
        kind: 'quadratic-linear',
        factor,
        power,
        coefficientKind: 'linear',
        basisNumerator: xBasis,
        denominator,
      });
      basis.push({
        kind: 'quadratic-linear',
        factor,
        power,
        coefficientKind: 'constant',
        basisNumerator: division.quotient,
        denominator,
      });
    }
  }

  return basis;
}

function solveExactCoefficientSystem(
  basis: PartialFractionBasis[],
  numerator: ExactPolynomial,
): ExactScalar[] | null {
  const rowCount = basis.length;
  const coefficients: ExactScalar[][] = Array.from({ length: rowCount }, (_, degree) =>
    basis.map((entry) => getExactPolynomialCoefficient(entry.basisNumerator, degree)));
  const constants: ExactScalar[] = Array.from({ length: rowCount }, (_, degree) =>
    getExactPolynomialCoefficient(numerator, degree));

  const solved = solveExactLinearSystem(coefficients, constants);
  return solved.kind === 'success' ? solved.solution : null;
}

function buildLinearPowerTermNode(coefficient: ExactScalar, denominator: ExactPolynomial) {
  return normalizeAst(buildPartialFractionTermNode(coefficient, denominator));
}

function buildQuadraticTermNode(numerator: ExactPolynomial, denominator: ExactPolynomial) {
  return normalizeAst(['Divide', exactPolynomialToNode(numerator), exactPolynomialToNode(denominator)]);
}

function buildQuadraticTerm(
  factor: IrreducibleQuadraticFactor,
  denominator: ExactPolynomial,
  power: number,
  linearCoefficient: ExactScalar,
  constantCoefficient: ExactScalar,
): QuadraticPartialFractionTerm | null {
  const half = divideExactScalars(linearCoefficient, { numerator: 2, denominator: 1 });
  if (!half) {
    return null;
  }
  const derivativeCoefficient = half;
  const residualConstant = subtractExactScalars(
    constantCoefficient,
    multiplyExactScalars(derivativeCoefficient, factor.linearCoefficient),
  );
  const numerator = buildExactPolynomialFromCoefficients(factor.polynomial.variable, [
    linearCoefficient,
    constantCoefficient,
  ]);
  const node = buildQuadraticTermNode(numerator, denominator);

  return {
    kind: 'irreducible-quadratic',
    linearCoefficient,
    constantCoefficient,
    derivativeCoefficient,
    residualConstant,
    power,
    factor,
    denominator,
    numerator,
    node,
    latex: ce.box(node as Parameters<typeof ce.box>[0]).latex,
  };
}

export function decomposeRationalPartialFractionReadiness(
  rational: ExactRationalFunction,
): RationalPartialFractionReadinessResult {
  const normalized = buildNormalizedRationalFunction(rational);
  if (normalized.kind === 'stop') {
    return normalized;
  }

  const { numerator, denominator, variable } = normalized.rational;
  if (exactPolynomialDegree(numerator) >= exactPolynomialDegree(denominator)) {
    return { kind: 'stop', reason: 'not-proper' };
  }

  const factorization = factorSupportedRationalDenominator(denominator);
  if (factorization.kind === 'stop') {
    return factorization;
  }

  const basis = buildPartialFractionBasis(factorization);
  if (!basis) {
    return { kind: 'stop', reason: 'unsupported-factorization' };
  }

  const coefficients = solveExactCoefficientSystem(basis, numerator);
  if (!coefficients) {
    return { kind: 'stop', reason: 'unsupported-factorization' };
  }

  const terms: RationalPartialFractionReadinessTerm[] = [];
  for (let index = 0; index < basis.length; index += 1) {
    const entry = basis[index];
    const coefficient = coefficients[index];

    if (entry.kind === 'linear-power') {
      if (exactScalarIsZero(coefficient)) {
        continue;
      }
      const node = buildLinearPowerTermNode(coefficient, entry.denominator);
      terms.push({
        kind: 'linear-power',
        coefficient,
        root: entry.factor.root,
        power: entry.power,
        denominator: entry.denominator,
        node,
        latex: ce.box(node as Parameters<typeof ce.box>[0]).latex,
      });
      continue;
    }

    const siblingIndex = basis.findIndex((candidate, candidateIndex) =>
      candidateIndex > index
      && candidate.kind === 'quadratic-linear'
      && candidate.factor === entry.factor
      && candidate.power === entry.power
      && candidate.coefficientKind !== entry.coefficientKind);
    if (entry.coefficientKind !== 'linear' || siblingIndex < 0) {
      continue;
    }
    if (exactScalarIsZero(coefficient) && exactScalarIsZero(coefficients[siblingIndex])) {
      continue;
    }

    const term = buildQuadraticTerm(
      entry.factor,
      entry.denominator,
      entry.power,
      coefficient,
      coefficients[siblingIndex],
    );
    if (!term) {
      return { kind: 'stop', reason: 'unsupported-factorization' };
    }
    terms.push(term);
  }

  const reconstructedNode = terms.length === 0
    ? 0
    : terms.length === 1
      ? terms[0].node
      : normalizeAst(['Add', ...terms.map((term) => term.node)]);

  return {
    kind: 'success',
    variable,
    factorization,
    terms,
    reconstructedNode,
    reconstructedLatex: ce.box(reconstructedNode as Parameters<typeof ce.box>[0]).latex,
  };
}
