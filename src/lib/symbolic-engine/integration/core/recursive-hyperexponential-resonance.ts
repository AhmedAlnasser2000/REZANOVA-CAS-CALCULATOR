/** Complete parent-field test for alpha - n*eta = D(u)/u. */
import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import type { DifferentialElement as E, DifferentialBounds } from './differential-field';
import { type CertifiedTowerView, verifyCertifiedTowerWithin } from './recursive-certified-tower';
import { radicalValuations, type RadicalRelation } from './rational-logarithmic-relations';
import { solveRecursiveLogarithmicRelationsWithin, verifyRecursiveLogarithmicRelationsWithin, type RecursiveLogarithmicRelations } from './recursive-logarithmic-relations';
import { verifyRadicalRelationMapping } from './recursive-logarithmic-membership';

export interface HyperexponentialResonance {
  readonly relations: RecursiveLogarithmicRelations;
  readonly exponent: Rational | null;
  readonly witness: RadicalRelation | null;
  readonly actual: boolean;
}
function projection(ctx: ExecutionContext, relations: RecursiveLogarithmicRelations) {
  // Admission excludes a radical logarithmic derivative of eta, hence projection
  // to alpha is injective and the entire relation space has dimension at most one.
  demand(relations.basis.length <= 1, 'verification-failed', 'hyperexponential resonance dimension');
  if (!relations.basis.length) return {exponent: null, witness: null, actual: false};
  const b = relations.basis[0];
  demand(b.coefficients.length === 2 && !Q.isZero(ctx, b.coefficients[0]), 'verification-failed', 'hyperexponential admission resonance independence');
  const inverse = Q.inverse(ctx, b.coefficients[0]), exponent = Q.negate(ctx, Q.multiply(ctx, b.coefficients[1], inverse)); ctx.allocate(b.valuations.length);
  const witness = radicalValuations(ctx, [Q.fromInteger(ctx, 1n), Q.negate(ctx, exponent)], b.valuations.map(c => Q.multiply(ctx, c, inverse)));
  return {exponent, witness, actual: witness.index === 1n};
}
export function solveHyperexponentialResonance(ctx: ExecutionContext, view: CertifiedTowerView, alpha: E, bounds: DifferentialBounds): HyperexponentialResonance {
  verifyCertifiedTowerWithin(ctx, view, bounds);
  demand(view.monomial === 'hyperexponential' && view.parent !== null && view.rate !== null, 'domain-mismatch', 'certified hyperexponential resonance');
  view.parent.owner.assert(ctx, alpha);
  const relations = solveRecursiveLogarithmicRelationsWithin(ctx, view.parent, [alpha, view.rate], bounds); ctx.allocate(4);
  const e = Object.freeze({relations, ...projection(ctx, relations)}); verifyHyperexponentialResonance(ctx, view, alpha, e, bounds); return e;
}
export function verifyHyperexponentialResonance(ctx: ExecutionContext, view: CertifiedTowerView, alpha: E, e: HyperexponentialResonance, bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, view, bounds);
  demand(view.monomial === 'hyperexponential' && view.parent !== null && view.rate !== null, 'domain-mismatch', 'certified hyperexponential resonance');
  verifyRecursiveLogarithmicRelationsWithin(ctx, view.parent, [alpha, view.rate], e.relations, bounds);
  const expected = projection(ctx, e.relations);
  demand(e.actual === expected.actual && (expected.exponent === null ? e.exponent === null : e.exponent !== null && Q.equal(ctx, e.exponent, expected.exponent)),
    'verification-failed', 'complete hyperexponential resonance exponent');
  verifyRadicalRelationMapping(ctx, e.witness, expected.witness);
}
