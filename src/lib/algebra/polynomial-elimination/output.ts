import {
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialToLatex,
  getExactPolynomialCoefficient,
  primitiveExactPolynomial,
  type ExactPolynomial,
} from '../polynomial-core';
import { validatePolynomial } from './bivariate-polynomial';
import {
  bivariateStop,
  type BivariateResultantSuccess,
  type PolynomialResult,
  type RequiredBivariateResultantOptions,
  type SubstitutionResult,
} from './types';
import type { VariableSubstitutionSnapshot } from '../../../types/calculator';

export function combineSubstitutions(
  left: VariableSubstitutionSnapshot[],
  right: VariableSubstitutionSnapshot[],
) {
  const byName = new Map<string, VariableSubstitutionSnapshot>();
  for (const entry of [...left, ...right]) {
    byName.set(entry.name, entry);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeProjectedPolynomial(polynomial: ExactPolynomial): PolynomialResult {
  const primitive = primitiveExactPolynomial(polynomial);
  if (!primitive || exactPolynomialIsZero(primitive.polynomial)) {
    return bivariateStop('projection-ambiguity');
  }
  if (exactPolynomialDegree(primitive.polynomial) === 0) {
    return bivariateStop('constant-polynomial', { constantContext: 'resultant' });
  }
  return { kind: 'success', polynomial: primitive.polynomial };
}

export function validateProjectedPolynomial(
  polynomial: ExactPolynomial,
  options: RequiredBivariateResultantOptions,
): PolynomialResult {
  const projected = normalizeProjectedPolynomial(polynomial);
  return projected.kind === 'stop'
    ? projected
    : validatePolynomial(projected.polynomial, options);
}

export function buildBivariateResultantSuccess({
  retainedVariable,
  eliminatedVariable,
  leftDegree,
  rightDegree,
  projectedPolynomial,
  substitutedLeftLatex,
  substitutedRightLatex,
  leftSubstitution,
  rightSubstitution,
}: {
  retainedVariable: string;
  eliminatedVariable: string;
  leftDegree: number;
  rightDegree: number;
  projectedPolynomial: ExactPolynomial;
  substitutedLeftLatex: string;
  substitutedRightLatex: string;
  leftSubstitution: Extract<SubstitutionResult, { kind: 'success' }>;
  rightSubstitution: Extract<SubstitutionResult, { kind: 'success' }>;
}): BivariateResultantSuccess {
  return {
    kind: 'success',
    retainedVariable,
    eliminatedVariable,
    leftDegree,
    rightDegree,
    sylvesterDimension: leftDegree + rightDegree,
    projectedPolynomial,
    projectedLatex: exactPolynomialToLatex(projectedPolynomial),
    substitutedLeftLatex,
    substitutedRightLatex,
    substitutions: combineSubstitutions(leftSubstitution.substitutions, rightSubstitution.substitutions),
    protectedSubstitutions: combineSubstitutions(
      leftSubstitution.protectedSubstitutions,
      rightSubstitution.protectedSubstitutions,
    ),
  };
}

export function getProjectedPolynomialCoefficient(result: BivariateResultantSuccess, degree: number) {
  return getExactPolynomialCoefficient(result.projectedPolynomial, degree);
}
