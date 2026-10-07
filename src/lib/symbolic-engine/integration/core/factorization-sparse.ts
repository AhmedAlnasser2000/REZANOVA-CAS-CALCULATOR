import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import { rational, type Rational } from './rational';
import { integerPower } from './factorization-integer';
import { MultivariateRing, type MultivariatePolynomial as P, type MultivariateTerm } from './multivariate-polynomial';

export interface FactorSparseDivision { readonly quotient: P<Rational>; readonly remainder: P<Rational> }
export function sparseFactorDivide(ctx: ExecutionContext, ring: MultivariateRing<Rational>, a: P<Rational>, b: P<Rational>): FactorSparseDivision {
  ring.assert(ctx, a); ring.assert(ctx, b); demand(b.terms.length > 0, 'division-by-zero', 'factor sparse divisor');
  let current = a, quotient = ring.zero(ctx), remainder = ring.zero(ctx);
  while (current.terms.length) {
    ctx.allocate(ring.arity + 2); const lead = current.terms[0], divisor = b.terms[0], powers = lead.powers.map((n, i) => n - divisor.powers[i]);
    if (powers.every(n => n >= 0)) {
      const t = ring.make(ctx, [{powers, coefficient: Q.multiply(ctx, lead.coefficient, Q.inverse(ctx, divisor.coefficient))}]);
      quotient = ring.add(ctx, quotient, t); current = ring.subtract(ctx, current, ring.multiply(ctx, t, b));
    } else { const t = ring.make(ctx, [lead]); remainder = ring.add(ctx, remainder, t); current = ring.subtract(ctx, current, t); }
  }
  const result = Object.freeze({quotient, remainder}); verifySparseFactorDivision(ctx, ring, a, b, result); return result;
}
export function verifySparseFactorDivision(ctx: ExecutionContext, ring: MultivariateRing<Rational>, a: P<Rational>, b: P<Rational>, proof: FactorSparseDivision) {
  ring.assert(ctx, a); ring.assert(ctx, b); demand(b.terms.length > 0, 'verification-failed', 'factor sparse divisor');
  ring.assert(ctx, proof.remainder);
  for (const t of proof.remainder.terms) demand(t.powers.some((n, i) => n < b.terms[0].powers[i]), 'verification-failed', 'sparse remainder monomial');
  demand(ring.equal(ctx, a, ring.add(ctx, ring.multiply(ctx, proof.quotient, b), proof.remainder)), 'verification-failed', 'sparse division reconstruction');
}
export function factorPartialDegrees(ctx: ExecutionContext, p: P<Rational>): readonly number[] {
  p.ring.assert(ctx, p); ctx.allocate(p.ring.arity); const degrees = Array<number>(p.ring.arity).fill(0);
  for (const t of p.terms) for (let i = 0; i < degrees.length; i++) { ctx.tick(); degrees[i] = Math.max(degrees[i], t.powers[i]); }
  return Object.freeze(degrees);
}
export function shiftFactorPolynomial(ctx: ExecutionContext, ring: MultivariateRing<Rational>, p: P<Rational>, points: readonly bigint[]): P<Rational> {
  ring.assert(ctx, p); demand(points.length === ring.arity - 1, 'verification-failed', 'factor specialization coordinates');
  let result = p;
  for (let coordinate = 1; coordinate < ring.arity; coordinate++) {
    const a = points[coordinate - 1]; ctx.integer(a); if (a === 0n) continue;
    const terms: MultivariateTerm<Rational>[] = [];
    for (const t of result.terms) {
      const n = t.powers[coordinate]; ctx.allocate((n + 1) * (ring.arity + 3)); let binomial = 1n;
      for (let k = 0; k <= n; k++) {
        const powers = [...t.powers]; powers[coordinate] = k;
        terms.push({powers, coefficient: Q.multiply(ctx, t.coefficient, rational(ctx, ctx.multiply(binomial, integerPower(ctx, a, BigInt(n - k))))) });
        if (k < n) binomial = ctx.quotient(ctx.multiply(binomial, BigInt(n - k)), BigInt(k + 1));
      }
    }
    result = ring.make(ctx, terms);
  }
  return result;
}
export function specializeFactorPolynomial(ctx: ExecutionContext, shifted: P<Rational>): readonly bigint[] {
  const ring = shifted.ring; ring.assert(ctx, shifted); const degree = ring.outerDegree(ctx, shifted);
  ctx.allocate(degree + 1); const cs = Array<bigint>(degree + 1).fill(0n);
  for (const t of shifted.terms) if (t.powers.slice(1).every(n => n === 0)) {
    demand(t.coefficient.denominator === 1n, 'verification-failed', 'specialized integer coefficient'); cs[t.powers[0]] = t.coefficient.numerator;
  }
  return Object.freeze(cs);
}
export function* factorSpecializationPoints(ctx: ExecutionContext, arity: number): Generator<readonly bigint[]> {
  demand(Number.isSafeInteger(arity) && arity >= 0, 'invalid-input', 'specialization arity');
  if (arity === 0) { yield Object.freeze([]); return; }
  function* visit(i: number, shell: bigint, boundary: boolean, prefix: readonly bigint[]): Generator<readonly bigint[]> {
    ctx.tick(); if (i === arity) { if (boundary) { ctx.allocate(arity); yield Object.freeze([...prefix]); } return; }
    for (let n = -shell; n <= shell; n = ctx.add(n, 1n)) {
      ctx.allocate(prefix.length + 1); yield* visit(i + 1, shell, boundary || n === -shell || n === shell, [...prefix, n]);
    }
  }
  for (let shell = 0n; ; shell = ctx.add(shell, 1n)) yield* visit(0, shell, false, []);
}
