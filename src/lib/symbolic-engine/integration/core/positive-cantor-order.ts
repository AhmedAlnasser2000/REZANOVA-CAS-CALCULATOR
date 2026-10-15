/** Complete exact finite class orders with compact terminal witnesses. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyPositiveCantorDomainWithin, verifyPositiveMumfordPairWithin, addPositiveMumfordPairsWithin, multiplyPositiveMumfordPairWithin, verifyPositiveMumfordMultipleWithin,
  type PositiveCantorDomain, type PositiveMumfordPair, type PositiveMumfordMultiple} from './positive-cantor';
import {cantorMultipleFunctions, type CantorFunctionFactor} from './cantor-arithmetic';
import type {PositivePolynomial} from './positive-polynomial';
import {finiteJacobianBound, verifyFiniteJacobianBound, factorPositiveInteger, verifyPositiveIntegerFactors, type FiniteJacobianBound, type IntegerPrimeFactor} from './reduced-divisor-order';
import {findFiniteClassOrderMultiple} from './finite-class-order-search';

export interface PositiveCantorOrder<E> {
  readonly rule: 'finite-cantor-class-order-v1';
  readonly input: PositiveMumfordPair<E>;
  readonly bound: FiniteJacobianBound;
  readonly order: bigint;
  readonly multiple: PositiveMumfordMultiple<E>;
  readonly functions: readonly CantorFunctionFactor<PositivePolynomial<E>>[];
  readonly factors: readonly IntegerPrimeFactor[];
  readonly exclusions: readonly Readonly<{prime: bigint; multiple: PositiveMumfordMultiple<E>}>[];
}
function neutral<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>): PositiveMumfordPair<E> {
  ctx.allocate(3); return Object.freeze({u: domain.ring.one(ctx), v: domain.ring.zero(ctx), normQuotient: domain.polynomial});
}
function zero<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, pair: PositiveMumfordPair<E>): boolean {return domain.ring.degree(ctx, pair.u) === 0;}
function equal<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, a: PositiveMumfordPair<E>, b: PositiveMumfordPair<E>): boolean {
  return domain.ring.equal(ctx, a.u, b.u) && domain.ring.equal(ctx, a.v, b.v);
}
function key<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, pair: PositiveMumfordPair<E>): string {
  const text = (p: PositivePolynomial<E>) => {
    ctx.allocate(p.coefficients.length); const values: string[] = [];
    for (const value of p.coefficients) {const index = domain.field.index(ctx, value).toString(); ctx.allocate(index.length); values.push(index);}
    const result = values.join(','); ctx.allocate(result.length); return result;
  };
  const result = `${text(pair.u)}|${text(pair.v)}`; ctx.allocate(result.length); return result;
}
function search<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, bound: FiniteJacobianBound, bounds: DifferentialBounds): bigint {
  ctx.allocate(5); return findFiniteClassOrderMultiple(ctx, {neutral: () => neutral(ctx, domain), zero: p => zero(ctx, domain, p),
    equal: (a, b) => equal(ctx, domain, a, b), key: p => key(ctx, domain, p), add: (a, b) => addPositiveMumfordPairsWithin(ctx, domain, a, b, bounds).result}, input, bound);
}
export function verifyPositiveCantorOrderWithin<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, proof: PositiveCantorOrder<E>, bounds: DifferentialBounds): void {
  verifyPositiveCantorDomainWithin(ctx, domain, bounds); verifyPositiveMumfordPairWithin(ctx, domain, input, bounds);
  verifyPositiveMumfordPairWithin(ctx, domain, proof.input, bounds);
  demand(domain.ring.degree(ctx, input.u) <= domain.genus && proof.rule === 'finite-cantor-class-order-v1' && equal(ctx, domain, input, proof.input), 'verification-failed', 'complete finite Cantor order request');
  verifyFiniteJacobianBound(ctx, domain.field.size, BigInt(domain.genus), proof.bound); ctx.integer(proof.order);
  demand(proof.order > 0n && proof.order <= proof.bound.upper, 'verification-failed', 'finite Cantor order inside complete bound');
  verifyPositiveMumfordMultipleWithin(ctx, domain, input, proof.order, proof.multiple, bounds);
  demand(zero(ctx, domain, proof.multiple.result), 'verification-failed', 'checked finite Cantor annihilator');
  const functions = cantorMultipleFunctions(ctx, proof.multiple);
  demand(functions.length === proof.functions.length && functions.every((f, i) => {
    ctx.integer(proof.functions[i].exponent); return f.kind === proof.functions[i].kind && f.exponent === proof.functions[i].exponent && domain.ring.equal(ctx, f.polynomial, proof.functions[i].polynomial);
  }), 'verification-failed', 'complete finite principal function witness');
  verifyPositiveIntegerFactors(ctx, proof.order, proof.factors); demand(proof.exclusions.length === proof.factors.length, 'verification-failed', 'finite Cantor least-order prime coverage');
  for (let i = 0; i < proof.factors.length; i++) {
    const prime = proof.factors[i].prime, exclusion = proof.exclusions[i]; demand(prime === exclusion.prime, 'verification-failed', 'finite order exact prime exclusion');
    verifyPositiveMumfordMultipleWithin(ctx, domain, input, ctx.quotient(proof.order, prime), exclusion.multiple, bounds);
    demand(!zero(ctx, domain, exclusion.multiple.result), 'verification-failed', 'finite order prime quotient is nonzero');
  }
}
export function decidePositiveCantorOrderWithin<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, bounds: DifferentialBounds): PositiveCantorOrder<E> {
  verifyPositiveCantorDomainWithin(ctx, domain, bounds); verifyPositiveMumfordPairWithin(ctx, domain, input, bounds); demand(domain.ring.degree(ctx, input.u) <= domain.genus, 'invalid-input', 'reduced finite class order input');
  const bound = finiteJacobianBound(ctx, domain.field.size, BigInt(domain.genus)), candidate = search(ctx, domain, input, bound, bounds), primes = factorPositiveInteger(ctx, candidate); let order = candidate;
  for (const f of primes) for (let n = 0n; n < f.multiplicity; n = ctx.add(n, 1n)) {
    const quotient = ctx.quotient(order, f.prime), multiple = multiplyPositiveMumfordPairWithin(ctx, domain, input, quotient, bounds);
    if (!zero(ctx, domain, multiple.result)) break; order = quotient;
  }
  const multiple = multiplyPositiveMumfordPairWithin(ctx, domain, input, order, bounds), functions = cantorMultipleFunctions(ctx, multiple), factors = factorPositiveInteger(ctx, order);
  ctx.allocate(8 + 3 * factors.length); const proof = Object.freeze({rule: 'finite-cantor-class-order-v1' as const, input, bound, order, multiple, functions, factors,
    exclusions: Object.freeze(factors.map(f => Object.freeze({prime: f.prime, multiple: multiplyPositiveMumfordPairWithin(ctx, domain, input, ctx.quotient(order, f.prime), bounds)})))});
  verifyPositiveCantorOrderWithin(ctx, domain, input, proof, bounds); return proof;
}
export function decidePositiveCantorOrder<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => decidePositiveCantorOrderWithin(ctx, domain, input, bounds));
}
export function verifyPositiveCantorOrder<E>(ctx: ExecutionContext, domain: PositiveCantorDomain<E>, input: PositiveMumfordPair<E>, proof: PositiveCantorOrder<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyPositiveCantorOrderWithin(ctx, domain, input, proof, bounds));
}
