import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { DifferentialElement as E, DifferentialBounds } from './differential-field';
import type { CertifiedTowerView } from './recursive-certified-tower';
import { radicalValuations, type RadicalRelation } from './rational-logarithmic-relations';
import { solveRecursiveLogarithmicRelationsWithin, verifyRecursiveLogarithmicRelationsWithin,
  type RecursiveLogarithmicRelations } from './recursive-logarithmic-relations';

export interface RecursiveLogarithmicMembership {
  readonly relations: RecursiveLogarithmicRelations;
  readonly witness: RadicalRelation | null;
  readonly radical: boolean;
  readonly actual: boolean;
}
function project(ctx: ExecutionContext, relations: RecursiveLogarithmicRelations): RadicalRelation | null {
  demand(relations.basis.length <= 1, 'verification-failed', 'recursive logarithmic membership dimension');
  if (!relations.basis.length) return null;
  const b = relations.basis[0];
  demand(b.coefficients.length === 1 && !Q.isZero(ctx, b.coefficients[0]), 'verification-failed', 'recursive membership projection');
  const inverse = Q.inverse(ctx, b.coefficients[0]); ctx.allocate(b.valuations.length);
  return radicalValuations(ctx, [Q.fromInteger(ctx, 1n)], b.valuations.map(v => Q.multiply(ctx, inverse, v)));
}
export function verifyRadicalRelationMapping(ctx: ExecutionContext, actual: RadicalRelation | null, expected: RadicalRelation | null): void {
  if (expected === null) { demand(actual === null, 'verification-failed', 'extraneous radical membership witness'); return; }
  demand(actual !== null && actual.index === expected.index && actual.coefficients.length === expected.coefficients.length
    && actual.valuations.length === expected.valuations.length && actual.powers.length === expected.powers.length,
    'verification-failed', 'complete radical membership witness');
  for (let i = 0; i < expected.coefficients.length; i++) demand(Q.equal(ctx, actual.coefficients[i], expected.coefficients[i]), 'verification-failed', 'radical membership coordinates');
  for (let i = 0; i < expected.valuations.length; i++) demand(Q.equal(ctx, actual.valuations[i], expected.valuations[i])
    && actual.powers[i] === expected.powers[i], 'verification-failed', 'minimal radical membership valuations');
}
export function solveRecursiveLogarithmicMembershipWithin(ctx: ExecutionContext, view: CertifiedTowerView, input: E, bounds: DifferentialBounds): RecursiveLogarithmicMembership {
  const relations = solveRecursiveLogarithmicRelationsWithin(ctx, view, [input], bounds), witness = project(ctx, relations); ctx.allocate(4);
  return Object.freeze({relations, witness, radical: witness !== null, actual: witness !== null && witness.index === 1n});
}
export function verifyRecursiveLogarithmicMembershipWithin(ctx: ExecutionContext, view: CertifiedTowerView, input: E,
  e: RecursiveLogarithmicMembership, bounds: DifferentialBounds): void {
  verifyRecursiveLogarithmicRelationsWithin(ctx, view, [input], e.relations, bounds);
  const witness = project(ctx, e.relations); verifyRadicalRelationMapping(ctx, e.witness, witness);
  demand(e.radical === (witness !== null) && e.actual === (witness !== null && witness.index === 1n), 'verification-failed', 'recursive logarithmic membership outcome');
}
export function solveRecursiveLogarithmicMembership(ctx: ExecutionContext, view: CertifiedTowerView, input: E, bounds: DifferentialBounds): RecursiveLogarithmicMembership {
  return ctx.operation(() => {
    const e = solveRecursiveLogarithmicMembershipWithin(ctx, view, input, bounds);
    verifyRecursiveLogarithmicMembershipWithin(ctx, view, input, e, bounds); return e;
  });
}
export function verifyRecursiveLogarithmicMembership(ctx: ExecutionContext, view: CertifiedTowerView, input: E,
  e: RecursiveLogarithmicMembership, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyRecursiveLogarithmicMembershipWithin(ctx, view, input, e, bounds));
}
