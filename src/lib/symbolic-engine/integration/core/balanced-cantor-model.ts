/** Exact polynomial parts at the two split infinite places, in characteristic
 * different from two. Smoothness and coefficient authority belong to callers. */
import {demand, type ExecutionContext} from './execution';
import {cantorNormQuotient, verifyCantorNormQuotient, type CantorPolynomialArithmetic} from './cantor-arithmetic';
import type {BalancedModel} from './balanced-cantor-arithmetic';

export interface BalancedInfinity<P> {readonly plus: P; readonly minus: P; readonly infinityRemainder: P}
export function verifyBalancedInfinity<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P> & BalancedInfinity<P>): void {
  for (const p of [m.polynomial, m.plus, m.minus, m.infinityRemainder]) r.assert(ctx, p);
  const degree = m.polynomial.coefficients.length - 1, half = m.plus.coefficients.length - 1;
  demand(degree >= 2 && degree % 2 === 0 && half === degree / 2 && m.genus === half - 1
    && r.equal(ctx, m.minus, r.negate(ctx, m.plus)) && m.infinityRemainder.coefficients.length <= m.genus + 1,
  'verification-failed', 'complete split infinity polynomial parts');
  const root = m.plus.coefficients[half], two = r.domain.fromInteger(ctx, 2n), leading = r.domain.multiply(ctx, root, root);
  demand(r.domain.equal(ctx, leading, m.polynomial.coefficients[degree])
    && !r.domain.equal(ctx, r.domain.multiply(ctx, two, root), r.domain.fromInteger(ctx, 0n)), 'verification-failed', 'distinct split infinity roots');
  verifyCantorNormQuotient(ctx, r, m.polynomial, r.one(ctx), m.plus, m.infinityRemainder);
}
export function constructBalancedInfinity<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, h: P, root: E): BalancedInfinity<P> {
  r.assert(ctx, h); const degree = h.coefficients.length - 1;
  demand(degree >= 2 && degree % 2 === 0 && r.domain.equal(ctx, r.domain.multiply(ctx, root, root), h.coefficients[degree]), 'invalid-input', 'supplied split infinity root');
  const half = degree / 2, zero = r.domain.fromInteger(ctx, 0n), denominator = r.domain.multiply(ctx, r.domain.fromInteger(ctx, 2n), root);
  demand(!r.domain.equal(ctx, denominator, zero), 'invalid-input', 'distinct split infinity roots');
  const inverse = r.domain.inverse(ctx, denominator); ctx.degree(half); ctx.allocate(half + 1);
  const values: E[] = Array<E>(half + 1).fill(zero); values[half] = root;
  for (let j = half - 1; j >= 0; j--) {
    let value = h.coefficients[half + j];
    for (let i = j + 1; i < half; i++) {ctx.tick(); value = r.domain.subtract(ctx, value, r.domain.multiply(ctx, values[i], values[half + j - i]));}
    values[j] = r.domain.multiply(ctx, value, inverse);
  }
  const plus = r.make(ctx, values), minus = r.negate(ctx, plus), infinityRemainder = cantorNormQuotient(ctx, r, h, r.one(ctx), plus);
  ctx.allocate(3); const proof = Object.freeze({plus, minus, infinityRemainder});
  verifyBalancedInfinity(ctx, r, {...proof, polynomial: h, genus: half - 1}); return proof;
}
