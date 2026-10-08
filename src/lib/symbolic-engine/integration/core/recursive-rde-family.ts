/** Exact paired maps; coefficient directions are never discarded by value alone. */
import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import type { DifferentialField, DifferentialElement as E } from './differential-field';
import { verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import type { Polynomial as P } from './polynomial';
import type { LinearSystem } from './linear-system';
import { matrixCapacity } from './recursive-coefficient-system';

export interface RecursiveRdePair {
  readonly coefficients: readonly Rational[];
  readonly value: E;
  readonly derivative: DerivativeEvidence;
}
export interface RecursiveRdeFamily {
  readonly particular: RecursiveRdePair;
  readonly directions: readonly RecursiveRdePair[];
}
export function rationalInOwner(ctx: ExecutionContext, owner: DifferentialField, value: Rational): E {
  let q = owner; while (q.parent) q = q.parent; return owner.embed(ctx, q.scalar(ctx, value));
}
export function rationalVectorCombination(ctx: ExecutionContext, values: readonly (readonly Rational[])[], coefficients: readonly Rational[], count: number): readonly Rational[] {
  demand(values.length === coefficients.length, 'verification-failed', 'rational family map dimensions');
  ctx.allocate(count); const result = Array<Rational>(count).fill(Q.fromInteger(ctx, 0n));
  for (let j = 0; j < values.length; j++) {
    demand(values[j].length === count, 'verification-failed', 'rational family target dimensions');
    for (let i = 0; i < count; i++) result[i] = Q.add(ctx, result[i], Q.multiply(ctx, coefficients[j], values[j][i]));
  }
  return Object.freeze(result);
}
export function nativeCombination(ctx: ExecutionContext, owner: DifferentialField, values: readonly E[], coefficients: readonly Rational[]): E {
  demand(values.length === coefficients.length, 'verification-failed', 'native family map dimensions');
  let result = owner.fromInteger(ctx, 0n);
  for (let i = 0; i < values.length; i++) result = owner.add(ctx, result, owner.multiply(ctx, rationalInOwner(ctx, owner, coefficients[i]), values[i]));
  return result;
}
export function polynomialCombination(ctx: ExecutionContext, owner: DifferentialField, values: readonly P<E>[], coefficients: readonly Rational[]): P<E> {
  const ring = owner.fractions!.ring; demand(values.length === coefficients.length, 'verification-failed', 'polynomial family map dimensions');
  let result = ring.zero(ctx);
  for (let i = 0; i < values.length; i++) result = ring.add(ctx, result, ring.scale(ctx, values[i], rationalInOwner(ctx, owner.parent!, coefficients[i])));
  return result;
}
export function homogeneousPolynomialConstraints(ctx: ExecutionContext, owner: DifferentialField, polynomials: readonly P<E>[]): LinearSystem<E> {
  let rows = 0; for (const p of polynomials) rows = Math.max(rows, p.coefficients.length);
  const zero = owner.parent!.fromInteger(ctx, 0n), columns = polynomials.length; matrixCapacity(ctx, rows, columns);
  const matrix: (readonly E[])[] = [], rhs: E[] = [];
  for (let i = 0; i < rows; i++) { ctx.allocate(columns); matrix.push(Object.freeze(polynomials.map(p => p.coefficients[i] ?? zero))); rhs.push(zero); }
  ctx.allocate(4); return Object.freeze({rows, columns, matrix: Object.freeze(matrix), rhs: Object.freeze(rhs)});
}
export function verifyRecursiveRdePair(ctx: ExecutionContext, owner: DifferentialField, a: E, initial: E, forcing: readonly E[], pair: RecursiveRdePair): void {
  demand(pair.coefficients.length === forcing.length, 'verification-failed', 'paired recursive RDE parameter coverage');
  verifyDerivative(ctx, owner, pair.value, pair.derivative);
  demand(owner.equal(ctx, owner.add(ctx, pair.derivative.derivative, owner.multiply(ctx, a, pair.value)),
    owner.add(ctx, initial, nativeCombination(ctx, owner, forcing, pair.coefficients))), 'verification-failed', 'independent paired recursive RDE identity');
}
