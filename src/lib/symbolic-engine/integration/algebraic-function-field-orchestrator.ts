import { tryAlgebraicGenus0Genus1BoundaryStop } from './algebraic-genus0/genus1-boundary';
import { tryAlgebraicGenus0RationalInRadicalRule } from './algebraic-genus0/rational-in-radical';
import { tryAlgebraicGenus0StandardRadicalRule } from './algebraic-genus0/standard-radicals';
import { tryAlgebraicGenus0SymbolicStandardRadicalRule } from './algebraic-genus0/symbolic-standard-radicals';
import { tryAlgebraicGenus1EllipticKindsRule } from './algebraic-genus1/elliptic-kinds-live';
import { tryAlgebraicHyperellipticBoundaryStop } from './algebraic-genus1/hyperelliptic-boundary';
import { tryAlgebraicGenus1RationalInRadicalHermiteRule } from './algebraic-genus1/rational-in-radical-hermite';
import { symbolicSuccess } from './metadata';
import type { IntegralResolution } from './types';

export type AlgebraicFunctionFieldFamily =
  | 'genus0-rational-in-radical'
  | 'genus0-standard-radical'
  | 'genus0-symbolic-standard-radical'
  | 'genus1-elliptic-kinds'
  | 'genus1-rational-in-radical-hermite'
  | 'genus1-boundary'
  | 'genus2-hyperelliptic-boundary';

export type AlgebraicFunctionFieldOrchestratorResult = {
  family: AlgebraicFunctionFieldFamily;
  resolution: IntegralResolution;
};

export function tryAlgebraicFunctionFieldOrchestrator(
  node: unknown,
  variable = 'x',
): AlgebraicFunctionFieldOrchestratorResult | undefined {
  const genus0Rational = tryAlgebraicGenus0RationalInRadicalRule(node, variable);
  if (genus0Rational) {
    return {
      family: 'genus0-rational-in-radical',
      resolution: symbolicSuccess(
        node,
        variable,
        genus0Rational.exactLatex,
        'u-substitution',
        genus0Rational.verification,
        genus0Rational.exactSupplementLatex,
      ),
    };
  }

  const genus0Standard = tryAlgebraicGenus0StandardRadicalRule(node, variable);
  if (genus0Standard) {
    return {
      family: 'genus0-standard-radical',
      resolution: symbolicSuccess(
        node,
        variable,
        genus0Standard.exactLatex,
        'u-substitution',
        genus0Standard.verification,
        genus0Standard.exactSupplementLatex,
      ),
    };
  }

  const genus0SymbolicStandard = tryAlgebraicGenus0SymbolicStandardRadicalRule(node, variable);
  if (genus0SymbolicStandard) {
    return {
      family: 'genus0-symbolic-standard-radical',
      resolution: symbolicSuccess(
        node,
        variable,
        genus0SymbolicStandard.exactLatex,
        'u-substitution',
        genus0SymbolicStandard.verification,
        genus0SymbolicStandard.exactSupplementLatex,
      ),
    };
  }

  const genus1EllipticKinds = tryAlgebraicGenus1EllipticKindsRule(node, variable);
  if (genus1EllipticKinds) {
    return {
      family: 'genus1-elliptic-kinds',
      resolution: symbolicSuccess(
        node,
        variable,
        genus1EllipticKinds.exactLatex,
        'u-substitution',
        genus1EllipticKinds.verification,
        genus1EllipticKinds.exactSupplementLatex,
        genus1EllipticKinds.detailSections,
      ),
    };
  }

  const genus1Hermite = tryAlgebraicGenus1RationalInRadicalHermiteRule(node, variable);
  if (genus1Hermite) {
    return {
      family: 'genus1-rational-in-radical-hermite',
      resolution: symbolicSuccess(
        node,
        variable,
        genus1Hermite.exactLatex,
        'u-substitution',
        genus1Hermite.verification,
        genus1Hermite.exactSupplementLatex,
        genus1Hermite.detailSections,
      ),
    };
  }

  const hyperellipticBoundary = tryAlgebraicHyperellipticBoundaryStop(node, variable);
  if (hyperellipticBoundary) {
    return {
      family: 'genus2-hyperelliptic-boundary',
      resolution: {
        kind: 'error',
        error: hyperellipticBoundary.error,
        candidate: hyperellipticBoundary.candidate,
      },
    };
  }

  const genus1Boundary = tryAlgebraicGenus0Genus1BoundaryStop(node, variable);
  if (genus1Boundary) {
    return {
      family: 'genus1-boundary',
      resolution: {
        kind: 'error',
        error: genus1Boundary.error,
        candidate: genus1Boundary.candidate,
      },
    };
  }

  return undefined;
}
