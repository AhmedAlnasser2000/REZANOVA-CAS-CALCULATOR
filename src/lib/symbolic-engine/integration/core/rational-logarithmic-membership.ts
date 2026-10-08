import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { DifferentialField, DifferentialElement as E, DifferentialBounds } from './differential-field';
import { solveRationalLogarithmicDerivativeRelations, verifyRationalLogarithmicRelationsWithin,
  radicalValuations, type RationalLogarithmicRelations, type RadicalRelation } from './rational-logarithmic-relations';

export interface RationalLogarithmicMembership {
  readonly relations: RationalLogarithmicRelations;
  readonly witness: RadicalRelation | null;
  readonly radical: boolean;
  readonly actual: boolean;
}
function project(ctx: ExecutionContext, e: RationalLogarithmicRelations): RadicalRelation | null {
  demand(e.basis.length <= 1, 'verification-failed', 'one-dimensional logarithmic membership');
  if (!e.basis.length) return null;
  const b = e.basis[0]; demand(b.coefficients.length === 1 && !Q.isZero(ctx, b.coefficients[0]), 'verification-failed', 'logarithmic membership coordinate');
  const inverse = Q.inverse(ctx, b.coefficients[0]); ctx.allocate(b.valuations.length);
  return radicalValuations(ctx, [Q.fromInteger(ctx, 1n)], b.valuations.map(c => Q.multiply(ctx, c, inverse)));
}
export function verifyRationalLogarithmicMembershipWithin(ctx: ExecutionContext, owner: DifferentialField, input: E, e: RationalLogarithmicMembership, bounds: DifferentialBounds): void {
  verifyRationalLogarithmicRelationsWithin(ctx, owner, [input], e.relations, bounds);
  const expected = project(ctx, e.relations);
  demand(e.radical === (expected !== null) && e.actual === (expected !== null && expected.index === 1n), 'verification-failed', 'logarithmic membership kind');
  if (expected === null) { demand(e.witness === null, 'verification-failed', 'extraneous logarithmic witness'); return; }
  const actual = e.witness;
  demand(actual !== null && actual.index === expected.index && actual.coefficients.length === 1
    && Q.equal(ctx, actual.coefficients[0], Q.fromInteger(ctx, 1n)) && actual.valuations.length === expected.valuations.length
    && actual.powers.length === expected.powers.length, 'verification-failed', 'logarithmic membership witness coverage');
  for (let i = 0; i < expected.valuations.length; i++) demand(Q.equal(ctx, actual.valuations[i], expected.valuations[i])
    && actual.powers[i] === expected.powers[i], 'verification-failed', 'logarithmic membership prime valuations');
}
export function solveRationalLogarithmicMembership(ctx: ExecutionContext, owner: DifferentialField, input: E, bounds: DifferentialBounds): RationalLogarithmicMembership {
  return ctx.operation(() => {
    const relations = solveRationalLogarithmicDerivativeRelations(ctx, owner, [input], bounds), witness = project(ctx, relations); ctx.allocate(4);
    const e = Object.freeze({relations, witness, radical: witness !== null, actual: witness !== null && witness.index === 1n});
    verifyRationalLogarithmicMembershipWithin(ctx, owner, input, e, bounds); return e;
  });
}
export function verifyRationalLogarithmicMembership(ctx: ExecutionContext, owner: DifferentialField, input: E, e: RationalLogarithmicMembership, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyRationalLogarithmicMembershipWithin(ctx, owner, input, e, bounds));
}
