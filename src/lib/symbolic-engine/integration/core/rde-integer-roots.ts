import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import type { Polynomial as P, PolynomialRing } from './polynomial';
import { polynomialDivide, verifyDivision, type Division } from './polynomial-division';
import { squareFree, verifySquareFree, type SquareFreeDecomposition } from './polynomial-square-free';

export interface IntegerRootInterval {
  readonly lower: bigint;
  readonly upper: bigint;
  readonly leftVariation: number;
  readonly rightVariation: number;
  readonly root: boolean;
}
export interface IntegerRootEvidence {
  readonly squareFree: SquareFreeDecomposition<E>;
  readonly polynomial: P<E>;
  readonly sturm: readonly P<E>[];
  readonly divisions: readonly Division<E>[];
  readonly bound: bigint;
  readonly intervals: readonly IntegerRootInterval[];
  readonly roots: readonly bigint[];
}
export function scalarSign(ctx: ExecutionContext, a: E): number {
  a.owner.assert(ctx, a); demand(a.kind === 'scalar', 'domain-mismatch', 'RDE rational scalar');
  return a.value.numerator < 0n ? -1 : a.value.numerator > 0n ? 1 : 0;
}
export function evaluateInteger(ctx: ExecutionContext, ring: PolynomialRing<E>, p: P<E>, n: bigint): E {
  ring.assert(ctx, p); const x = ring.domain.fromInteger(ctx, n); let out = ring.domain.fromInteger(ctx, 0n);
  for (let i = p.coefficients.length - 1; i >= 0; i--) out = ring.domain.add(ctx, ring.domain.multiply(ctx, out, x), p.coefficients[i]);
  return out;
}
function cauchy(ctx: ExecutionContext, ring: PolynomialRing<E>, p: P<E>): bigint {
  const lead = ring.leading(ctx, p); let largest = 0n;
  for (let i = 0; i < p.coefficients.length - 1; i++) {
    const ratio = ring.domain.exactDivide(ctx, p.coefficients[i], lead);
    demand(ratio.kind === 'scalar', 'domain-mismatch', 'Cauchy rational coefficient');
    const n = ratio.value.numerator < 0n ? -ratio.value.numerator : ratio.value.numerator, d = ratio.value.denominator;
    const ceil = ctx.add(ctx.quotient(n, d), ctx.remainder(n, d) === 0n ? 0n : 1n);
    if (ceil > largest) largest = ceil;
  }
  return ctx.add(largest, 1n);
}
/** One-sided Sturm signs include endpoint roots without numerical perturbations. */
function variation(ctx: ExecutionContext, ring: PolynomialRing<E>, chain: readonly P<E>[], x: bigint, side: -1 | 1): number {
  let last = 0, count = 0;
  for (const p of chain) {
    let h = p, order = 0, sign = scalarSign(ctx, evaluateInteger(ctx, ring, h, x));
    while (sign === 0) {
      ctx.tick(); demand(ring.degree(ctx, h) > 0, 'verification-failed', 'zero Sturm entry');
      h = ring.derivative(ctx, h); order++; sign = scalarSign(ctx, evaluateInteger(ctx, ring, h, x));
    }
    if (side === -1 && order % 2) sign = -sign;
    if (last && sign !== last) count++; last = sign;
  }
  return count;
}
function squareFreePart(ctx: ExecutionContext, ring: PolynomialRing<E>, d: SquareFreeDecomposition<E>): P<E> {
  let p = ring.one(ctx);
  for (const f of d.factors) p = ring.multiply(ctx, p, f.factor);
  return p;
}
function check(ctx: ExecutionContext, ring: PolynomialRing<E>, input: P<E>, proof: IntegerRootEvidence): void {
  verifySquareFree(ctx, ring, input, proof.squareFree);
  demand(ring.equal(ctx, proof.polynomial, squareFreePart(ctx, ring, proof.squareFree)), 'verification-failed', 'integer-root square-free part');
  const p = proof.polynomial, chain = proof.sturm;
  demand(chain.length >= 1 && ring.equal(ctx, chain[0], p), 'verification-failed', 'Sturm initial polynomial');
  if (ring.degree(ctx, p) === 0) {
    demand(chain.length === 1 && proof.divisions.length === 0, 'verification-failed', 'constant Sturm sequence');
  } else {
    demand(chain.length >= 2 && ring.equal(ctx, chain[1], ring.derivative(ctx, p)), 'verification-failed', 'Sturm derivative');
    demand(proof.divisions.length === chain.length - 1, 'verification-failed', 'Sturm division coverage');
    for (let i = 0; i < proof.divisions.length; i++) {
      verifyDivision(ctx, ring, chain[i], chain[i + 1], proof.divisions[i]);
      if (i + 2 < chain.length) demand(!ring.isZero(ctx, chain[i + 2])
        && ring.equal(ctx, chain[i + 2], ring.negate(ctx, proof.divisions[i].remainder)), 'verification-failed', 'Sturm sign/transition');
      else demand(ring.isZero(ctx, proof.divisions[i].remainder) && ring.degree(ctx, chain[i + 1]) === 0,
        'verification-failed', 'Sturm termination');
    }
  }
  ctx.integer(proof.bound);
  demand(proof.bound === cauchy(ctx, ring, p), 'verification-failed', 'integer-root Cauchy bound');
  let next = 1n, rootIndex = 0;
  for (const interval of proof.intervals) {
    ctx.tick(); ctx.integer(interval.lower); ctx.integer(interval.upper);
    demand(interval.lower === next && interval.upper >= interval.lower && interval.upper <= proof.bound,
      'verification-failed', 'integer interval coverage');
    const left = variation(ctx, ring, chain, interval.lower, -1), right = variation(ctx, ring, chain, interval.upper, 1);
    demand(left === interval.leftVariation && right === interval.rightVariation, 'verification-failed', 'Sturm variation');
    if (interval.lower === interval.upper) {
      const root = ring.domain.isZero(ctx, evaluateInteger(ctx, ring, p, interval.lower));
      demand(interval.root === root, 'verification-failed', 'integer root evaluation');
      if (root) {
        demand(proof.roots[rootIndex] === interval.lower, 'verification-failed', 'integer root list'); rootIndex++;
      }
    } else demand(interval.root === false && left === right, 'verification-failed', 'unexcluded integer interval');
    next = ctx.add(interval.upper, 1n);
  }
  demand(next === ctx.add(proof.bound, 1n) && rootIndex === proof.roots.length, 'verification-failed', 'incomplete integer roots');
}
export function verifyIntegerRoots(ctx: ExecutionContext, ring: PolynomialRing<E>, input: P<E>, proof: IntegerRootEvidence): void {
  ctx.operation(() => check(ctx, ring, input, proof));
}
export function positiveIntegerRoots(ctx: ExecutionContext, ring: PolynomialRing<E>, input: P<E>): IntegerRootEvidence {
  return ctx.operation(() => {
    demand(!ring.isZero(ctx, input), 'invalid-input', 'zero integer-root polynomial');
    const decomposition = squareFree(ctx, ring, input), p = squareFreePart(ctx, ring, decomposition);
    ctx.allocate(2); const chain = [p], divisions: Division<E>[] = [];
    if (ring.degree(ctx, p) > 0) {
      ctx.allocate(1); chain.push(ring.derivative(ctx, p));
      for (;;) {
        const division = polynomialDivide(ctx, ring, chain[chain.length - 2], chain[chain.length - 1]);
        ctx.allocate(1); divisions.push(division);
        if (ring.isZero(ctx, division.remainder)) break;
        ctx.allocate(1); chain.push(ring.negate(ctx, division.remainder));
      }
    }
    const bound = cauchy(ctx, ring, p), intervals: IntegerRootInterval[] = [], roots: bigint[] = [];
    ctx.allocate(5); const pending: [bigint, bigint][] = [[1n, bound]];
    while (pending.length) {
      ctx.tick(); const [lower, upper] = pending.pop()!;
      const leftVariation = variation(ctx, ring, chain, lower, -1), rightVariation = variation(ctx, ring, chain, upper, 1);
      if (lower === upper || leftVariation === rightVariation) {
        const root = lower === upper && ring.domain.isZero(ctx, evaluateInteger(ctx, ring, p, lower));
        ctx.allocate(6); intervals.push(Object.freeze({ lower, upper, leftVariation, rightVariation, root }));
        if (root) { ctx.allocate(1); roots.push(lower); }
      } else {
        const mid = ctx.add(lower, ctx.quotient(ctx.add(upper, -lower), 2n));
        ctx.allocate(6); pending.push([ctx.add(mid, 1n), upper], [lower, mid]);
      }
    }
    ctx.allocate(7);
    const proof = Object.freeze({ squareFree: decomposition, polynomial: p, sturm: Object.freeze(chain), divisions: Object.freeze(divisions),
      bound, intervals: Object.freeze(intervals), roots: Object.freeze(roots) });
    check(ctx, ring, input, proof); return proof;
  });
}
