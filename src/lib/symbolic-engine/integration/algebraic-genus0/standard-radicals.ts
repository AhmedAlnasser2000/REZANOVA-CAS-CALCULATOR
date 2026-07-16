import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import { algebraicGenus0FactsToExactSupplementLatex } from './facts';
import {
  tryAlgebraicGenus0InverseReadback,
  type AlgebraicGenus0InverseReadbackSource,
} from './inverse-readback';

export type AlgebraicGenus0StandardRadicalRule = {
  antiderivativeNode: unknown;
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
  source: AlgebraicGenus0InverseReadbackSource;
};

const STANDARD_RADICAL_SOURCES = new Set<AlgebraicGenus0InverseReadbackSource>([
  'affine-radical',
  'quadratic-minus',
  'quadratic-outside',
  'quadratic-plus',
]);

function userFacingSupplements(
  result: Extract<ReturnType<typeof tryAlgebraicGenus0InverseReadback>, { kind: 'success' }>,
) {
  const facts = result.pullback.parametrization.facts.filter(
    (item) => item.kind !== 'substitution-denominator-nonzero',
  );
  return algebraicGenus0FactsToExactSupplementLatex(facts);
}

export function tryAlgebraicGenus0StandardRadicalRule(
  integrand: unknown,
  variable = 'x',
): AlgebraicGenus0StandardRadicalRule | undefined {
  const result = tryAlgebraicGenus0InverseReadback(integrand, variable);
  if (result.kind !== 'success' || !STANDARD_RADICAL_SOURCES.has(result.source)) {
    return undefined;
  }

  return {
    antiderivativeNode: result.antiderivativeNode,
    exactLatex: result.exactLatex,
    verification: result.verification,
    exactSupplementLatex: userFacingSupplements(result),
    source: result.source,
  };
}
