import {demand, type ExecutionContext} from './execution';
import {isAlgebraicField, algebraicHeight} from './algebraic-field';
import {rationalField as Q} from './field';
import type {DifferentialBounds} from './differential-field';
import {assertPolynomialRingOwner, type Polynomial, type PolynomialRing} from './polynomial';
import {polynomialDivide} from './polynomial-division';
import {rationalGcdPrimeFields, checkedRationalGcdPrimeField} from './rational-gcd-evidence';
import {modularRationalReconstruction} from './modular-rational-reconstruction';
import {numberFieldModularDescriptor, numberFieldModularImage, type NumberFieldModularImage} from './number-field-modular-image';
import type {ModularCoefficientBezout, ModularCoefficientPolynomial} from './modular-coefficient-polynomial';
import type {Rational} from './rational';

interface ModularBoundEvidence {
  readonly prime: bigint;
  readonly gcd: readonly (readonly bigint[])[];
  readonly s: readonly (readonly bigint[])[];
  readonly t: readonly (readonly bigint[])[];
}
/** Terminal modular degree evidence + exact characteristic-zero divisibility
 * proves completeness. CRT is a producer technique, never trusted authority. */
export interface NumberFieldModularGcdCertificate<E> {
  readonly kind: 'trivial' | 'modular';
  readonly inputA: Polynomial<E>;
  readonly inputB: Polynomial<E>;
  readonly gcd: Polynomial<E>;
  readonly quotientA: Polynomial<E>;
  readonly quotientB: Polynomial<E>;
  readonly bound: ModularBoundEvidence | null;
}
function source<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, bounds?: DifferentialBounds) {
  assertPolynomialRingOwner(ctx, r); if (bounds) algebraicHeight(ctx, r.domain, bounds);
  demand(r.domain === Q || isAlgebraicField(r.domain), 'domain-mismatch', 'registered number-field polynomial'); r.assert(ctx, a); r.assert(ctx, b);
  return numberFieldModularDescriptor(ctx, r.domain);
}
function mapPolynomial(ctx: ExecutionContext, image: NumberFieldModularImage, coefficients: readonly (readonly Rational[])[]) {
  ctx.allocate(coefficients.length); const out: unknown[] = [];
  for (const cs of coefficients) {const value = image.fromCoordinates(ctx, cs); if (value === null) return null; out.push(value);}
  const p = image.polynomials.make(ctx, out);
  return p.coefficients.length === coefficients.length ? p : null;
}
function retained(ctx: ExecutionContext, image: NumberFieldModularImage, prime: bigint, proof: ModularCoefficientBezout<unknown>): ModularBoundEvidence {
  const save = (p: ModularCoefficientPolynomial<unknown>) => {ctx.allocate(p.coefficients.length); return Object.freeze(p.coefficients.map(c => image.coordinates(ctx, c)));};
  ctx.allocate(4); return Object.freeze({prime, gcd: save(proof.gcd), s: save(proof.s), t: save(proof.t)});
}
function certificate<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, gcd: Polynomial<E>, bound: ModularBoundEvidence | null): NumberFieldModularGcdCertificate<E> | null {
  const ad = r.isZero(ctx, gcd) ? {quotient: r.zero(ctx), remainder: a} : polynomialDivide(ctx, r, a, gcd);
  if (!r.isZero(ctx, ad.remainder)) return null;
  const bd = r.isZero(ctx, gcd) ? {quotient: r.zero(ctx), remainder: b} : polynomialDivide(ctx, r, b, gcd);
  if (!r.isZero(ctx, bd.remainder)) return null;
  ctx.allocate(7); return Object.freeze({kind: bound === null ? 'trivial' : 'modular', inputA: a, inputB: b, gcd, quotientA: ad.quotient, quotientB: bd.quotient, bound});
}
export function produceNumberFieldModularGcdWithin<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, bounds?: DifferentialBounds): NumberFieldModularGcdCertificate<E> {
  demand(ctx.operationToken !== undefined, 'invalid-input', 'modular GCD composition scope');
  const descriptor = source(ctx, r, a, b, bounds);
  if (r.isZero(ctx, a) || r.isZero(ctx, b) || r.degree(ctx, a) === 0 || r.degree(ctx, b) === 0) {
    const nonzero = r.isZero(ctx, a) ? b : a;
    const gcd = r.isZero(ctx, a) && r.isZero(ctx, b) ? r.zero(ctx) : r.degree(ctx, a) === 0 || r.degree(ctx, b) === 0 ? r.one(ctx)
      : r.scale(ctx, nonzero, r.domain.inverse(ctx, r.leading(ctx, nonzero)));
    const out = certificate(ctx, r, a, b, gcd, null); demand(out !== null, 'verification-failed', 'trivial number-field GCD'); return out;
  }
  ctx.allocate(a.coefficients.length + b.coefficients.length);
  const ac = a.coefficients.map(c => descriptor.coordinates(ctx, c)), bc = b.coefficients.map(c => descriptor.coordinates(ctx, c));
  let degree = Math.min(a.coefficients.length, b.coefficients.length) - 1, modulus = 1n, residues: bigint[][] = [];
  for (const prime of rationalGcdPrimeFields(ctx)) {
    const image = numberFieldModularImage(ctx, descriptor, prime); if (image === null) continue;
    const aa = mapPolynomial(ctx, image, ac), bb = mapPolynomial(ctx, image, bc); if (aa === null || bb === null) continue;
    const proof = image.polynomials.bezout(ctx, aa, bb); if (proof === null) continue;
    const d = proof.gcd.coefficients.length - 1; demand(d >= 0, 'verification-failed', 'nonzero modular GCD');
    if (d > degree) continue;
    if (d < degree) {degree = d; modulus = 1n; residues = [];}
    const bound = retained(ctx, image, prime.modulus, proof);
    if (degree === 0) {const out = certificate(ctx, r, a, b, r.one(ctx), bound); demand(out !== null, 'verification-failed', 'modular coprime inputs'); return out;}
    const size = (degree + 1) * descriptor.dimension; demand(Number.isSafeInteger(size), 'invalid-input', 'number-field CRT dimension'); ctx.allocate(size + degree + 1);
    const inverse = prime.inverse(ctx, prime.residue(ctx, modulus)), next = ctx.multiply(modulus, prime.modulus);
    residues = proof.gcd.coefficients.map((c, i) => image.coordinates(ctx, c).map((value, j) => {
      const previous = residues[i]?.[j] ?? 0n, difference = prime.plus(ctx, value, -prime.residue(ctx, previous));
      return ctx.add(previous, ctx.multiply(modulus, prime.times(ctx, difference, inverse)));
    })); modulus = next;
    ctx.allocate(degree + 1); const coefficients: E[] = []; let recovered = true;
    for (const cs of residues) {
      ctx.allocate(cs.length); const qs: Rational[] = [];
      for (const value of cs) {const q = modularRationalReconstruction(ctx, value, modulus); if (q === null) {recovered = false; break;} qs.push(q);}
      if (!recovered) break; coefficients.push(descriptor.native(ctx, qs));
    }
    if (!recovered) continue;
    const candidate = r.make(ctx, coefficients);
    if (r.degree(ctx, candidate) !== degree || !r.domain.equal(ctx, r.leading(ctx, candidate), r.domain.fromInteger(ctx, 1n))) continue;
    const out = certificate(ctx, r, a, b, candidate, bound); if (out !== null) return out;
  }
  demand(false, 'verification-failed', 'complete number-field prime coverage');
}
export function verifyNumberFieldModularGcdWithin<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, proof: NumberFieldModularGcdCertificate<E>, bounds?: DifferentialBounds): void {
  demand(proof !== null && typeof proof === 'object', 'verification-failed', 'number-field GCD certificate');
  const descriptor = source(ctx, r, a, b, bounds);
  demand(r.equal(ctx, a, proof.inputA) && r.equal(ctx, b, proof.inputB), 'verification-failed', 'number-field GCD explicit inputs');
  for (const p of [proof.gcd, proof.quotientA, proof.quotientB]) r.assert(ctx, p);
  demand(r.equal(ctx, r.multiply(ctx, proof.gcd, proof.quotientA), a) && r.equal(ctx, r.multiply(ctx, proof.gcd, proof.quotientB), b), 'verification-failed', 'number-field GCD quotient reconstruction');
  if (r.isZero(ctx, proof.gcd)) {demand(proof.kind === 'trivial' && proof.bound === null && r.isZero(ctx, a) && r.isZero(ctx, b), 'verification-failed', 'zero GCD coverage'); return;}
  demand(r.domain.equal(ctx, r.leading(ctx, proof.gcd), r.domain.fromInteger(ctx, 1n)), 'verification-failed', 'number-field monic GCD');
  if (proof.kind === 'trivial') {
    demand(proof.bound === null && (r.isZero(ctx, a) || r.isZero(ctx, b) || r.degree(ctx, a) === 0 || r.degree(ctx, b) === 0), 'verification-failed', 'trivial GCD applicability');
    if (r.isZero(ctx, a) || r.isZero(ctx, b)) demand(r.degree(ctx, proof.gcd) === r.degree(ctx, r.isZero(ctx, a) ? b : a), 'verification-failed', 'zero-input complete GCD');
    else demand(r.degree(ctx, proof.gcd) === 0, 'verification-failed', 'constant-input complete GCD'); return;
  }
  demand(proof.kind === 'modular' && proof.bound !== null, 'verification-failed', 'modular GCD bound coverage');
  const bound = proof.bound, prime = checkedRationalGcdPrimeField(ctx, bound.prime), image = numberFieldModularImage(ctx, descriptor, prime);
  demand(image !== null, 'verification-failed', 'number-field prime denominators'); ctx.allocate(a.coefficients.length + b.coefficients.length);
  const aa = mapPolynomial(ctx, image, a.coefficients.map(c => descriptor.coordinates(ctx, c))), bb = mapPolynomial(ctx, image, b.coefficients.map(c => descriptor.coordinates(ctx, c)));
  demand(aa !== null && bb !== null && bb.coefficients.length > 0, 'verification-failed', 'modular input degree preservation');
  // The modular Euclidean degree bound requires the second leading coefficient
  // to be a unit. A stored Bezout identity alone would not establish this.
  demand(image.coefficients.inverse(ctx, bb.coefficients.at(-1)!) !== null, 'verification-failed', 'modular leading unit');
  const bind = (cs: readonly (readonly bigint[])[]) => {
    demand(Array.isArray(cs), 'verification-failed', 'modular polynomial coverage'); ctx.degree(cs.length - 1); ctx.allocate(cs.length);
    const value = image.polynomials.make(ctx, cs.map(c => image.bind(ctx, c)));
    demand(value.coefficients.length === cs.length, 'verification-failed', 'canonical modular polynomial'); return value;
  };
  const e = {gcd: bind(bound.gcd), s: bind(bound.s), t: bind(bound.t)};
  image.polynomials.verifyBezout(ctx, aa, bb, e);
  demand(e.gcd.coefficients.length - 1 === r.degree(ctx, proof.gcd), 'verification-failed', 'complete modular GCD degree bound');
}
export function produceNumberFieldModularGcd<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => {const proof = produceNumberFieldModularGcdWithin(ctx, r, a, b, bounds); verifyNumberFieldModularGcdWithin(ctx, r, a, b, proof, bounds); return proof;});
}
export function verifyNumberFieldModularGcd<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, proof: NumberFieldModularGcdCertificate<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyNumberFieldModularGcdWithin(ctx, r, a, b, proof, bounds));
}
