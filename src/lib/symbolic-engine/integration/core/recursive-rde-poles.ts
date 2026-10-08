/** Exact valuations and all integer normal-pole resonances. No trial pole order. */
import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialElement as E, DifferentialBounds } from './differential-field';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { PolynomialRing, type Polynomial as P } from './polynomial';
import { polynomialDivide, verifyDivision, extendedGcd, verifyBezout, type Division, type Bezout } from './polynomial-division';
import { integerRootsRecursive, verifyRecursiveIntegerRootsWithin, type RecursiveIntegerRootEvidence } from './recursive-integer-roots';

export interface PolynomialValuation {
  readonly input: P<E>;
  readonly divisions: readonly Division<E>[];
  readonly order: bigint | null;
  readonly unit: P<E>;
}
export interface FractionValuation {
  readonly numerator: PolynomialValuation;
  readonly denominator: PolynomialValuation;
  readonly order: bigint | null;
}
export interface NormalPoleResonance {
  readonly valuation: FractionValuation;
  readonly derivative: DerivativeEvidence;
  readonly normal: Bezout<E>;
  readonly inverse: Bezout<E>;
  readonly residue: Division<E>;
  readonly derivativeRemainder: Division<E>;
  readonly ring: PolynomialRing<E>;
  readonly indicial: P<E>;
  readonly roots: RecursiveIntegerRootEvidence<E>;
  readonly positive: bigint | null;
}
export function recursiveFraction(ctx: ExecutionContext, owner: DifferentialField, value: E) {
  owner.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'recursive fraction required'); return value.value;
}
export function recursivePolynomialValue(ctx: ExecutionContext, owner: DifferentialField, value: P<E>): E {
  return owner.fraction(ctx, owner.fractions!.make(ctx, value, owner.fractions!.ring.one(ctx)));
}
export function checkedDerivativePolynomial(ctx: ExecutionContext, owner: DifferentialField, evidence: DerivativeEvidence): P<E> {
  const f = recursiveFraction(ctx, owner, evidence.derivative);
  demand(owner.fractions!.ring.equal(ctx, f.denominator, owner.fractions!.ring.one(ctx)), 'verification-failed', 'total derivative is polynomial');
  return f.numerator;
}
export function polynomialValuation(ctx: ExecutionContext, owner: DifferentialField, input: P<E>, prime: P<E>): PolynomialValuation {
  const ring = owner.fractions!.ring;
  demand(ring.degree(ctx, prime) > 0, 'invalid-input', 'positive-degree valuation prime');
  if (ring.isZero(ctx, input)) { ctx.allocate(4); return Object.freeze({input, divisions: Object.freeze([]), order: null, unit: input}); }
  const divisions: Division<E>[] = []; let unit = input, order = 0n;
  while (true) {
    const division = polynomialDivide(ctx, ring, unit, prime); ctx.allocate(1); divisions.push(division);
    if (!ring.isZero(ctx, division.remainder)) break;
    demand(ring.degree(ctx, division.quotient) < ring.degree(ctx, unit), 'verification-failed', 'valuation decreasing degree');
    unit = division.quotient; order = ctx.add(order, 1n);
  }
  ctx.allocate(4); return Object.freeze({input, divisions: Object.freeze(divisions), order, unit});
}
export function verifyPolynomialValuation(ctx: ExecutionContext, owner: DifferentialField, input: P<E>, prime: P<E>, e: PolynomialValuation): void {
  const ring = owner.fractions!.ring;
  demand(ring.degree(ctx, prime) > 0 && ring.equal(ctx, input, e.input), 'verification-failed', 'valuation expected input');
  if (ring.isZero(ctx, input)) {
    demand(e.order === null && e.divisions.length === 0 && ring.isZero(ctx, e.unit), 'verification-failed', 'zero valuation'); return;
  }
  demand(e.order !== null && e.order >= 0n && e.order === BigInt(e.divisions.length - 1), 'verification-failed', 'valuation complete division coverage');
  let unit = input;
  for (let i = 0; i < e.divisions.length; i++) {
    const division = e.divisions[i]; verifyDivision(ctx, ring, unit, prime, division);
    if (i + 1 === e.divisions.length) demand(!ring.isZero(ctx, division.remainder), 'verification-failed', 'valuation nondivisible terminal unit');
    else {
      demand(ring.isZero(ctx, division.remainder) && ring.degree(ctx, division.quotient) < ring.degree(ctx, unit), 'verification-failed', 'valuation exact decreasing step');
      unit = division.quotient;
    }
  }
  demand(ring.equal(ctx, e.unit, unit), 'verification-failed', 'valuation unit mapping');
}
export function fractionValuation(ctx: ExecutionContext, owner: DifferentialField, input: E, prime: P<E>): FractionValuation {
  const f = recursiveFraction(ctx, owner, input), numerator = polynomialValuation(ctx, owner, f.numerator, prime), denominator = polynomialValuation(ctx, owner, f.denominator, prime);
  demand(denominator.order !== null, 'verification-failed', 'nonzero denominator valuation'); ctx.allocate(3);
  return Object.freeze({numerator, denominator, order: numerator.order === null ? null : ctx.add(numerator.order, -denominator.order)});
}
export function verifyFractionValuation(ctx: ExecutionContext, owner: DifferentialField, input: E, prime: P<E>, e: FractionValuation): void {
  const f = recursiveFraction(ctx, owner, input);
  verifyPolynomialValuation(ctx, owner, f.numerator, prime, e.numerator); verifyPolynomialValuation(ctx, owner, f.denominator, prime, e.denominator);
  demand(e.denominator.order !== null && e.order === (e.numerator.order === null ? null : ctx.add(e.numerator.order, -e.denominator.order)), 'verification-failed', 'fraction valuation mapping');
}
function indicial(ctx: ExecutionContext, owner: DifferentialField, ring: PolynomialRing<E>, residue: P<E>, dp: P<E>): P<E> {
  return ring.make(ctx, [recursivePolynomialValue(ctx, owner, residue), owner.negate(ctx, recursivePolynomialValue(ctx, owner, dp))]);
}
function positiveRoot(ctx: ExecutionContext, roots: RecursiveIntegerRootEvidence<E>): bigint | null {
  demand(roots.kind === 'finite', 'verification-failed', 'nonzero normal indicial polynomial');
  const positive = roots.roots.filter(n => n > 0n); ctx.allocate(positive.length);
  demand(positive.length <= 1, 'verification-failed', 'unique integer normal residue'); return positive[0] ?? null;
}
export function normalPoleResonance(ctx: ExecutionContext, owner: DifferentialField, a: E, prime: P<E>, bounds: DifferentialBounds): NormalPoleResonance {
  const ring = owner.fractions!.ring, valuation = fractionValuation(ctx, owner, a, prime);
  demand(valuation.order === -1n, 'invalid-input', 'simple coefficient pole required');
  const value = recursivePolynomialValue(ctx, owner, prime), derivative = differentiate(ctx, owner, value), dp = checkedDerivativePolynomial(ctx, owner, derivative);
  const normal = extendedGcd(ctx, ring, prime, dp), inverse = extendedGcd(ctx, ring, valuation.denominator.unit, prime);
  demand(ring.equal(ctx, normal.gcd, ring.one(ctx)) && ring.equal(ctx, inverse.gcd, ring.one(ctx)), 'verification-failed', 'normal pole quotient units');
  const residue = polynomialDivide(ctx, ring, ring.multiply(ctx, valuation.numerator.unit, inverse.s), prime), derivativeRemainder = polynomialDivide(ctx, ring, dp, prime);
  const auxiliary = new PolynomialRing(owner, 'poleOrder'), polynomial = indicial(ctx, owner, auxiliary, residue.remainder, derivativeRemainder.remainder);
  const roots = integerRootsRecursive(ctx, auxiliary, polynomial, bounds); ctx.allocate(10);
  const e = Object.freeze({valuation, derivative, normal, inverse, residue, derivativeRemainder, ring: auxiliary, indicial: polynomial, roots, positive: positiveRoot(ctx, roots)});
  verifyNormalPoleResonance(ctx, owner, a, prime, e, bounds); return e;
}
export function verifyNormalPoleResonance(ctx: ExecutionContext, owner: DifferentialField, a: E, prime: P<E>, e: NormalPoleResonance, bounds: DifferentialBounds): void {
  const ring = owner.fractions!.ring; verifyFractionValuation(ctx, owner, a, prime, e.valuation);
  demand(e.valuation.order === -1n && e.ring.domain === owner && e.ring.variable === 'poleOrder', 'verification-failed', 'normal resonance expected domain');
  verifyDerivative(ctx, owner, recursivePolynomialValue(ctx, owner, prime), e.derivative);
  const dp = checkedDerivativePolynomial(ctx, owner, e.derivative);
  verifyBezout(ctx, ring, prime, dp, e.normal); verifyBezout(ctx, ring, e.valuation.denominator.unit, prime, e.inverse);
  demand(ring.equal(ctx, e.normal.gcd, ring.one(ctx)) && ring.equal(ctx, e.inverse.gcd, ring.one(ctx)), 'verification-failed', 'normal resonance unit identities');
  verifyDivision(ctx, ring, ring.multiply(ctx, e.valuation.numerator.unit, e.inverse.s), prime, e.residue);
  verifyDivision(ctx, ring, dp, prime, e.derivativeRemainder);
  demand(e.ring.equal(ctx, e.indicial, indicial(ctx, owner, e.ring, e.residue.remainder, e.derivativeRemainder.remainder)), 'verification-failed', 'normal indicial sign and coverage');
  verifyRecursiveIntegerRootsWithin(ctx, e.ring, e.indicial, e.roots, bounds);
  demand(e.positive === positiveRoot(ctx, e.roots), 'verification-failed', 'complete positive pole resonance');
}
