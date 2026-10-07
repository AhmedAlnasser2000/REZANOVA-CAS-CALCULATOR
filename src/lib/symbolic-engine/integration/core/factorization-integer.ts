import { demand, type ExecutionContext } from './execution';
import { rationalField } from './field';
import { integerGcd, rational, type Rational } from './rational';
import { PolynomialRing, type Polynomial } from './polynomial';
import { polynomialDivide, verifyDivision } from './polynomial-division';
import { FactorModularRing, FactorPrimeField, isFactorPrime, modularBezout, verifyModularBezout,
  type FactorModularBezout, type FactorModularPolynomial } from './factorization-modular';
import { factorFinitePolynomial, verifyFiniteDecomposition, type FactorFiniteDecomposition } from './factorization-finite';

export interface FactorIntegerLift { readonly modulus: bigint; readonly factors: readonly (readonly bigint[])[] }
export interface FactorIntegerRejection {
  readonly mask: bigint;
  readonly candidate: readonly bigint[];
  readonly quotient: readonly Rational[];
  readonly remainder: readonly Rational[];
}
export interface FactorIntegerIrreducibility {
  readonly bound: bigint;
  readonly finite: FactorFiniteDecomposition;
  readonly inverses: readonly FactorModularBezout[];
  readonly lifts: readonly FactorIntegerLift[];
  readonly rejected: readonly FactorIntegerRejection[];
}
export type FactorIntegerTree = Readonly<{ polynomial: readonly bigint[] } & (
  | { kind: 'linear' }
  | { kind: 'split'; left: FactorIntegerTree; right: FactorIntegerTree; proof: FactorIntegerIrreducibility; mask: bigint }
  | { kind: 'irreducible'; proof: FactorIntegerIrreducibility }
)>;

export function integerPower(ctx: ExecutionContext, a: bigint, exponent: bigint): bigint {
  ctx.integer(a); ctx.integer(exponent); demand(exponent >= 0n, 'invalid-input', 'factorization integer exponent');
  let base = a, out = 1n, n = exponent;
  while (n) {
    if (ctx.remainder(n, 2n)) out = ctx.multiply(out, base);
    n = ctx.quotient(n, 2n); if (n) base = ctx.multiply(base, base);
  }
  return out;
}
export function primitiveInteger(ctx: ExecutionContext, input: readonly bigint[]): readonly bigint[] {
  ctx.degree(input.length - 1); ctx.allocate(input.length);
  let length = input.length; for (const c of input) ctx.integer(c);
  while (length && input[length - 1] === 0n) { ctx.tick(); length--; }
  let content = 0n; for (let i = 0; i < length; i++) content = integerGcd(ctx, content, input[i]);
  if (!length) return Object.freeze([]);
  if (input[length - 1] < 0n) content = -content;
  return Object.freeze(input.slice(0, length).map(c => ctx.quotient(c, content)));
}
export function integerPolynomial(ctx: ExecutionContext, ring: PolynomialRing<Rational>, cs: readonly bigint[]): Polynomial<Rational> {
  ctx.allocate(cs.length); return ring.make(ctx, cs.map(c => rational(ctx, c)));
}
export function factorCoefficientBound(ctx: ExecutionContext, norm: bigint, degrees: readonly number[]): bigint {
  ctx.integer(norm); demand(norm > 0n, 'verification-failed', 'factor bound zero norm'); let sum = 0n;
  for (const n of degrees) { ctx.degree(n); sum = ctx.add(sum, BigInt(n)); }
  // Integer-only application of the multivariate length/Mahler bound.
  return ctx.multiply(integerPower(ctx, 2n, sum), norm);
}
function coefficientBound(ctx: ExecutionContext, f: readonly bigint[]): bigint {
  let norm = 0n; for (const c of f) norm = ctx.add(norm, c < 0n ? -c : c);
  return factorCoefficientBound(ctx, norm, [f.length - 1]);
}
export function factorRecoveryThreshold(ctx: ExecutionContext, bound: bigint) { return ctx.multiply(2n, ctx.multiply(bound, bound)); }
function primitiveInput(ctx: ExecutionContext, f: readonly bigint[]): void {
  demand(Array.isArray(f) && f.length >= 2, 'verification-failed', 'integer factorization polynomial');
  const normalized = primitiveInteger(ctx, f);
  demand(normalized.length === f.length && normalized.every((c, i) => c === f[i]), 'verification-failed', 'integer primitive normalization');
}
function selectFinite(ctx: ExecutionContext, f: readonly bigint[]): FactorFiniteDecomposition {
  for (let p = 2n; ; p = ctx.add(p, 1n)) {
    if (!isFactorPrime(ctx, p)) continue;
    const field = new FactorPrimeField(ctx, p), v = field.make(ctx, f);
    if (v.coefficients.length !== f.length) continue;
    const g = modularBezout(ctx, field, v, field.derivative(ctx, v));
    if (g.gcd.length !== 1) continue;
    return factorFinitePolynomial(ctx, field, v);
  }
}
function product(ctx: ExecutionContext, ring: FactorModularRing, factors: readonly (readonly bigint[])[]) {
  let out = ring.one(ctx); for (const f of factors) out = ring.multiply(ctx, out, ring.bind(ctx, f)); return out;
}
export function liftIntegerModularFactors(ctx: ExecutionContext, input: readonly bigint[], finite: FactorFiniteDecomposition, bound: bigint) {
  const field = new FactorPrimeField(ctx, finite.prime), seeds = finite.factors.map(f => f.polynomial);
  ctx.allocate(seeds.length * 2);
  const inverses = seeds.map((f, i) => {
    const others = product(ctx, field, seeds.filter((_, j) => i !== j));
    return modularBezout(ctx, field, others, field.bind(ctx, f));
  });
  const lifts: FactorIntegerLift[] = [Object.freeze({modulus: finite.prime, factors: Object.freeze(seeds)})];
  const threshold = factorRecoveryThreshold(ctx, bound); let modulus = finite.prime, factors: readonly (readonly bigint[])[] = seeds;
  while (modulus <= threshold) {
    const next = ctx.multiply(modulus, finite.prime), ring = new FactorModularRing(ctx, next);
    const target = ring.scale(ctx, ring.make(ctx, input), ring.inverse(ctx, input[input.length - 1]));
    const error = ring.subtract(ctx, target, product(ctx, ring, factors)); ctx.allocate(error.coefficients.length);
    const e = field.make(ctx, error.coefficients.map(c => {
      demand(ctx.remainder(c, modulus) === 0n, 'verification-failed', 'Hensel error divisibility'); return ctx.quotient(c, modulus);
    }));
    ctx.allocate(factors.length); const out = factors.map((f, i) => {
      const correction = field.multiplyMod(ctx, e, field.bind(ctx, inverses[i].s), field.bind(ctx, seeds[i]));
      ctx.allocate(f.length);
      return ring.make(ctx, f.map((c, j) => ctx.add(c, ctx.multiply(modulus, correction.coefficients[j] ?? 0n)))).coefficients;
    });
    ctx.allocate(3); lifts.push(Object.freeze({modulus: next, factors: Object.freeze(out)})); factors = out; modulus = next;
  }
  return {inverses: Object.freeze(inverses), lifts: Object.freeze(lifts)};
}
export function verifyIntegerModularLift(ctx: ExecutionContext, input: readonly bigint[], proof: Omit<FactorIntegerIrreducibility, 'rejected'>, bound: bigint): FactorIntegerLift {
  demand(proof.bound === bound, 'verification-failed', 'integer factor bound');
  const field = new FactorPrimeField(ctx, proof.finite.prime), f = field.make(ctx, input);
  demand(f.coefficients.length === input.length, 'verification-failed', 'modular degree loss');
  verifyFiniteDecomposition(ctx, field, f, proof.finite);
  const seeds = proof.finite.factors.map(f => f.polynomial); ctx.allocate(seeds.length);
  demand(Array.isArray(proof.inverses) && proof.inverses.length === seeds.length, 'verification-failed', 'Hensel inverse coverage');
  for (let i = 0; i < seeds.length; i++) {
    verifyModularBezout(ctx, field, product(ctx, field, seeds.filter((_, j) => i !== j)), field.bind(ctx, seeds[i]), proof.inverses[i]);
    demand(proof.inverses[i].gcd.length === 1 && proof.inverses[i].gcd[0] === 1n, 'verification-failed', 'Hensel inverse GCD');
  }
  demand(Array.isArray(proof.lifts) && proof.lifts.length > 0, 'verification-failed', 'Hensel lift coverage');
  let previous: FactorIntegerLift | undefined;
  for (const step of proof.lifts) {
    ctx.integer(step.modulus);
    demand(step.modulus === (previous ? ctx.multiply(previous.modulus, field.modulus) : field.modulus),
      'verification-failed', 'Hensel modulus transition');
    demand(Array.isArray(step.factors) && step.factors.length === seeds.length, 'verification-failed', 'Hensel factor coverage');
    const ring = new FactorModularRing(ctx, step.modulus), lower = previous ? new FactorModularRing(ctx, previous.modulus) : field;
    for (let i = 0; i < seeds.length; i++) {
      const v = ring.bind(ctx, step.factors[i]);
      demand(v.coefficients.length === seeds[i].length && v.coefficients[v.coefficients.length - 1] === 1n,
        'verification-failed', 'Hensel degree/monicity');
      demand(lower.equal(ctx, lower.make(ctx, v.coefficients), lower.bind(ctx, previous ? previous.factors[i] : seeds[i])),
        'verification-failed', 'Hensel factor correspondence');
    }
    demand(ring.equal(ctx, product(ctx, ring, step.factors), ring.scale(ctx, ring.make(ctx, input), ring.inverse(ctx, input[input.length - 1]))),
      'verification-failed', 'Hensel product identity');
    previous = step;
  }
  demand(previous!.modulus > factorRecoveryThreshold(ctx, proof.bound), 'verification-failed', 'insufficient Hensel precision');
  return previous!;
}
function candidate(ctx: ExecutionContext, input: readonly bigint[], last: FactorIntegerLift, mask: bigint): readonly bigint[] {
  const ring = new FactorModularRing(ctx, last.modulus); let out: FactorModularPolynomial = ring.one(ctx), bits = mask;
  for (const f of last.factors) {
    if (ctx.remainder(bits, 2n)) out = ring.multiply(ctx, out, ring.bind(ctx, f)); bits = ctx.quotient(bits, 2n);
  }
  demand(bits === 0n, 'verification-failed', 'factor subset range');
  out = ring.scale(ctx, out, input[input.length - 1]); ctx.allocate(out.coefficients.length);
  return primitiveInteger(ctx, out.coefficients.map(c => ctx.multiply(c, 2n) > last.modulus ? ctx.add(c, -last.modulus) : c));
}

export function factorIntegerPolynomial(ctx: ExecutionContext, input: readonly bigint[]): FactorIntegerTree {
  primitiveInput(ctx, input); ctx.allocate(input.length + 2); const f = Object.freeze([...input]);
  if (f.length === 2) return Object.freeze({kind: 'linear', polynomial: f});
  const bound = coefficientBound(ctx, f), finite = selectFinite(ctx, f), lifting = liftIntegerModularFactors(ctx, f, finite, bound);
  const last = lifting.lifts[lifting.lifts.length - 1], maximum = integerPower(ctx, 2n, BigInt(last.factors.length));
  const q = new PolynomialRing(rationalField, 'z'), native = integerPolynomial(ctx, q, f), rejected: FactorIntegerRejection[] = [];
  for (let mask = 1n; mask < maximum - 1n; mask = ctx.add(mask, 1n)) {
    const c = candidate(ctx, f, last, mask), d = polynomialDivide(ctx, q, native, integerPolynomial(ctx, q, c));
    if (!d.remainder.coefficients.length) {
      ctx.allocate(d.quotient.coefficients.length);
      const other = d.quotient.coefficients.map(v => { demand(v.denominator === 1n, 'verification-failed', 'Gauss integral quotient'); return v.numerator; });
      const proof = Object.freeze({bound, finite, ...lifting, rejected: Object.freeze(rejected)});
      return Object.freeze({kind: 'split', polynomial: f, proof, mask, left: factorIntegerPolynomial(ctx, c), right: factorIntegerPolynomial(ctx, other)});
    }
    ctx.allocate(4); rejected.push(Object.freeze({mask, candidate: c, quotient: d.quotient.coefficients, remainder: d.remainder.coefficients}));
  }
  const proof = Object.freeze({bound, finite, ...lifting, rejected: Object.freeze(rejected)});
  const result = Object.freeze({kind: 'irreducible' as const, polynomial: f, proof}); verifyIntegerFactorTree(ctx, f, result); return result;
}

export function verifyIntegerFactorTree(ctx: ExecutionContext, expected: readonly bigint[], tree: FactorIntegerTree): void {
  primitiveInput(ctx, expected);
  demand(Array.isArray(tree.polynomial) && expected.length === tree.polynomial.length && expected.every((c, i) => { ctx.tick(); return c === tree.polynomial[i]; }),
    'verification-failed', 'integer factor tree input');
  const q = new PolynomialRing(rationalField, 'z'), native = integerPolynomial(ctx, q, expected);
  if (tree.kind === 'linear') { demand(expected.length === 2, 'verification-failed', 'linear irreducibility'); return; }
  if (tree.kind === 'split') {
    verifyIntegerCoverage(ctx, q, expected, tree.proof, tree.mask);
    const last = tree.proof.lifts[tree.proof.lifts.length - 1], selected = candidate(ctx, expected, last, tree.mask);
    demand(selected.length === tree.left.polynomial.length && selected.every((c, i) => c === tree.left.polynomial[i]), 'verification-failed', 'selected integer factor correspondence');
    demand(tree.left.polynomial.length < expected.length && tree.right.polynomial.length < expected.length,
      'verification-failed', 'factor tree strict degree descent');
    verifyIntegerFactorTree(ctx, tree.left.polynomial, tree.left); verifyIntegerFactorTree(ctx, tree.right.polynomial, tree.right);
    demand(q.equal(ctx, native, q.multiply(ctx, integerPolynomial(ctx, q, tree.left.polynomial), integerPolynomial(ctx, q, tree.right.polynomial))),
      'verification-failed', 'integer factor tree product'); return;
  }
  demand(tree.kind === 'irreducible', 'verification-failed', 'factor tree tag');
  verifyIntegerCoverage(ctx, q, expected, tree.proof);
}
function verifyIntegerCoverage(ctx: ExecutionContext, q: PolynomialRing<Rational>, expected: readonly bigint[], proof: FactorIntegerIrreducibility, selected?: bigint): void {
  const native = integerPolynomial(ctx, q, expected), last = verifyIntegerModularLift(ctx, expected, proof, coefficientBound(ctx, expected)), maximum = integerPower(ctx, 2n, BigInt(last.factors.length));
  const endpoint = selected ?? maximum - 1n; ctx.integer(endpoint);
  demand(endpoint > 0n && (selected === undefined || endpoint < maximum - 1n), 'verification-failed', 'selected integer subset range');
  demand(Array.isArray(proof.rejected), 'verification-failed', 'factor subset coverage'); let mask = 1n;
  for (const rejection of proof.rejected) {
    demand(mask < endpoint && rejection.mask === mask, 'verification-failed', 'factor subset coverage order');
    const c = candidate(ctx, expected, last, mask);
    demand(rejection.candidate.length === c.length && rejection.candidate.every((v: bigint, i: number) => v === c[i]), 'verification-failed', 'factor candidate recovery');
    const b = integerPolynomial(ctx, q, c), result = {quotient: q.make(ctx, rejection.quotient), remainder: q.make(ctx, rejection.remainder)};
    demand(q.degree(ctx, b) > 0 && q.degree(ctx, b) < q.degree(ctx, native), 'verification-failed', 'proper factor candidate');
    verifyDivision(ctx, q, native, b, result); demand(!q.isZero(ctx, result.remainder), 'verification-failed', 'unrejected factor candidate');
    mask = ctx.add(mask, 1n);
  }
  demand(mask === endpoint, 'verification-failed', 'incomplete irreducibility coverage');
}

export function integerFactorLeaves(ctx: ExecutionContext, tree: FactorIntegerTree): readonly (readonly bigint[])[] {
  ctx.tick(); if (tree.kind !== 'split') return Object.freeze([tree.polynomial]);
  const a = integerFactorLeaves(ctx, tree.left), b = integerFactorLeaves(ctx, tree.right); ctx.allocate(a.length + b.length);
  return Object.freeze([...a, ...b]);
}
