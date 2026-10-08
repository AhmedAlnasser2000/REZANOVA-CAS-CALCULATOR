/** Recursive polynomial-part constant extraction; never evaluate at a point. */
import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import type { DifferentialField, DifferentialElement as E } from './differential-field';
import { polynomialDivide, verifyDivision, type Division } from './polynomial-division';
import { recursiveFraction } from './recursive-rde-poles';

export interface RecursiveConstantExtraction {
  readonly input: E;
  readonly division: Division<E> | null;
  readonly parent: RecursiveConstantExtraction | null;
  readonly constant: Rational;
}
export function extractRecursiveConstant(ctx: ExecutionContext, owner: DifferentialField, input: E): RecursiveConstantExtraction {
  owner.assert(ctx, input); ctx.allocate(4);
  if (owner.kind === 'rational') {
    demand(input.kind === 'scalar', 'domain-mismatch', 'recursive scalar constant');
    return Object.freeze({input, division: null, parent: null, constant: input.value});
  }
  const f = recursiveFraction(ctx, owner, input), division = polynomialDivide(ctx, owner.fractions!.ring, f.numerator, f.denominator);
  const parent = extractRecursiveConstant(ctx, owner.parent!, division.quotient.coefficients[0] ?? owner.parent!.fromInteger(ctx, 0n));
  return Object.freeze({input, division, parent, constant: parent.constant});
}
export function verifyRecursiveConstantExtraction(ctx: ExecutionContext, owner: DifferentialField, input: E, e: RecursiveConstantExtraction): void {
  owner.assert(ctx, input); demand(owner.equal(ctx, input, e.input), 'verification-failed', 'recursive constant expected input'); Q.assert(ctx, e.constant);
  if (owner.kind === 'rational') {
    demand(input.kind === 'scalar' && e.division === null && e.parent === null && Q.equal(ctx, input.value, e.constant), 'verification-failed', 'recursive scalar extraction'); return;
  }
  const f = recursiveFraction(ctx, owner, input);
  demand(e.division !== null && e.parent !== null, 'verification-failed', 'complete recursive constant coverage');
  verifyDivision(ctx, owner.fractions!.ring, f.numerator, f.denominator, e.division);
  verifyRecursiveConstantExtraction(ctx, owner.parent!, e.division.quotient.coefficients[0] ?? owner.parent!.fromInteger(ctx, 0n), e.parent);
  demand(Q.equal(ctx, e.parent.constant, e.constant), 'verification-failed', 'recursive constant mapping');
}
