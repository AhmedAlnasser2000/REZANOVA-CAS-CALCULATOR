import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import { PolynomialRing, type Polynomial } from './polynomial';
import { RationalFunctionField } from './rational-function';
import { exactDivide, extendedGcd, verifyBezout, type Bezout } from './polynomial-division';
import type { DifferentialBounds } from './differential-field';
import { constructAlgebraicExtension, type AlgebraicField } from './algebraic-field';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';
import type { FunctionScalar } from './algebraic-presentation';

export interface PolynomialDenominatorEvidence {
  readonly denominators: readonly Polynomial<Rational>[];
  readonly steps: readonly Readonly<{gcd: Bezout<Rational>; previousQuotient: Polynomial<Rational>; denominatorQuotient: Polynomial<Rational>; next: Polynomial<Rational>}>[];
  readonly common: Polynomial<Rational>;
}
export function polynomialDenominators(ctx: ExecutionContext, r: PolynomialRing<Rational>, denominators: readonly Polynomial<Rational>[]): PolynomialDenominatorEvidence {
  let common = r.one(ctx); ctx.allocate(denominators.length * 2 + 3);
  const steps: PolynomialDenominatorEvidence['steps'][number][] = [];
  for (const denominator of denominators) {
    const gcd = extendedGcd(ctx, r, common, denominator), previousQuotient = exactDivide(ctx, r, common, gcd.gcd), denominatorQuotient = exactDivide(ctx, r, denominator, gcd.gcd);
    const next = r.multiply(ctx, previousQuotient, denominator); steps.push(Object.freeze({gcd, previousQuotient, denominatorQuotient, next})); common = next;
  }
  const proof = Object.freeze({denominators: Object.freeze([...denominators]), steps: Object.freeze(steps), common});
  verifyPolynomialDenominators(ctx, r, denominators, proof); return proof;
}
export function verifyPolynomialDenominators(ctx: ExecutionContext, r: PolynomialRing<Rational>, denominators: readonly Polynomial<Rational>[], proof: PolynomialDenominatorEvidence): void {
  demand(proof.denominators.length === denominators.length && proof.steps.length === denominators.length, 'verification-failed', 'denominator coverage');
  let common = r.one(ctx);
  for (let i = 0; i < denominators.length; i++) {
    const d = denominators[i], s = proof.steps[i]; r.assert(ctx, d);
    demand(!r.isZero(ctx, d) && Q.equal(ctx, r.leading(ctx, d), Q.fromInteger(ctx, 1n)) && r.equal(ctx, d, proof.denominators[i]), 'verification-failed', 'monic denominator');
    verifyBezout(ctx, r, common, d, s.gcd);
    demand(r.equal(ctx, r.multiply(ctx, s.gcd.gcd, s.previousQuotient), common)
      && r.equal(ctx, r.multiply(ctx, s.gcd.gcd, s.denominatorQuotient), d)
      && r.equal(ctx, r.multiply(ctx, s.previousQuotient, d), s.next), 'verification-failed', 'LCM reconstruction'); common = s.next;
  }
  demand(r.equal(ctx, common, proof.common), 'verification-failed', 'common denominator');
}
/** Substitution x=1/u with exact reversed polynomials, including zero. */
export function reciprocalScalar(ctx: ExecutionContext, target: RationalFunctionField<Rational>, value: FunctionScalar): FunctionScalar {
  value.field.assert(ctx, value); const r = target.ring;
  if (!value.numerator.coefficients.length) return target.fromInteger(ctx, 0n);
  const nd = value.numerator.coefficients.length - 1, dd = value.denominator.coefficients.length - 1;
  ctx.allocate(nd + dd + 2);
  let numerator = r.make(ctx, [...value.numerator.coefficients].reverse()), denominator = r.make(ctx, [...value.denominator.coefficients].reverse());
  const shift = (p: Polynomial<Rational>, k: number) => {
    ctx.degree(r.degree(ctx, p) + k); ctx.allocate(p.coefficients.length + k);
    return r.make(ctx, [...Array(k).fill(Q.fromInteger(ctx, 0n)), ...p.coefficients]);
  };
  if (dd > nd) numerator = shift(numerator, dd - nd); else if (nd > dd) denominator = shift(denominator, nd - dd);
  return target.make(ctx, numerator, denominator);
}
export interface AlgebraicIntegralModel {
  readonly infinity: boolean;
  readonly field: AlgebraicField<FunctionScalar>;
  readonly transformed: Polynomial<FunctionScalar>;
  readonly denominators: PolynomialDenominatorEvidence;
}
export function algebraicIntegralModelWithin(ctx: ExecutionContext, presentation: AlgebraicField<FunctionScalar>, infinity: boolean,
  bounds: DifferentialBounds): AlgebraicIntegralModel {
  const base = infinity ? new RationalFunctionField(new PolynomialRing(Q, 'u')) : presentation.parent as RationalFunctionField<Rational>;
  const r = new PolynomialRing(base, 'beta'), transformed = r.make(ctx, presentation.modulus.coefficients.map(c => infinity ? reciprocalScalar(ctx, base, c) : c));
  const denominators = polynomialDenominators(ctx, base.ring, transformed.coefficients.map(c => c.denominator)), scale = base.make(ctx, denominators.common, base.ring.one(ctx));
  const n = r.degree(ctx, transformed); ctx.allocate(n + 1);
  const coefficients: FunctionScalar[] = []; let power = base.fromInteger(ctx, 1n);
  for (let i = n; i >= 0; i--) { coefficients[i] = base.multiply(ctx, transformed.coefficients[i], power); if (i > 0) power = base.multiply(ctx, power, scale); }
  for (const c of coefficients) demand(base.ring.degree(ctx, c.denominator) === 0, 'verification-failed', 'integral model coefficient');
  const field = constructAlgebraicExtension(ctx, r, r.make(ctx, coefficients), bounds), proof = Object.freeze({infinity, field, transformed, denominators});
  verifyAlgebraicIntegralModelWithin(ctx, presentation, infinity, proof, bounds); return proof;
}
export function verifyAlgebraicIntegralModelWithin(ctx: ExecutionContext, presentation: AlgebraicField<FunctionScalar>, infinity: boolean,
  proof: AlgebraicIntegralModel, bounds: DifferentialBounds): void {
  demand(proof.infinity === infinity && proof.field.parent instanceof RationalFunctionField, 'verification-failed', 'integral model scope');
  const base = proof.field.parent as RationalFunctionField<Rational>, r = proof.field.ring, n = presentation.ring.degree(ctx, presentation.modulus);
  if (!infinity) demand(base === presentation.parent, 'domain-mismatch', 'finite model parent');
  verifyAlgebraicChainWithin(ctx, proof.field, bounds);
  demand(r.degree(ctx, proof.transformed) === n && r.degree(ctx, proof.field.modulus) === n, 'verification-failed', 'integral model degree');
  for (let i = 0; i <= n; i++) {
    const expected = infinity ? reciprocalScalar(ctx, base, presentation.modulus.coefficients[i]) : presentation.modulus.coefficients[i];
    demand(base.equal(ctx, proof.transformed.coefficients[i], expected), 'verification-failed', 'reciprocal model correspondence');
  }
  verifyPolynomialDenominators(ctx, base.ring, proof.transformed.coefficients.map(c => c.denominator), proof.denominators);
  const scale = base.make(ctx, proof.denominators.common, base.ring.one(ctx)); let power = base.fromInteger(ctx, 1n);
  for (let i = n; i >= 0; i--) {
    demand(base.equal(ctx, proof.field.modulus.coefficients[i], base.multiply(ctx, proof.transformed.coefficients[i], power))
      && base.ring.degree(ctx, proof.field.modulus.coefficients[i].denominator) === 0, 'verification-failed', 'integral generator scaling');
    if (i > 0) power = base.multiply(ctx, power, scale);
  }
}
