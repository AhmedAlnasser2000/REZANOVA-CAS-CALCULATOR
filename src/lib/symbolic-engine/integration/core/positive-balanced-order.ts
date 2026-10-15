/** Complete finite split-even class orders, with distinct native evidence. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyPositiveBalancedDomainWithin, verifyPositiveBalancedDivisorWithin, addPositiveBalancedDivisorsWithin, multiplyPositiveBalancedDivisorWithin,
  verifyPositiveBalancedMultipleWithin, type PositiveBalancedDomain, type PositiveBalancedDivisor, type PositiveBalancedMultiple} from './positive-balanced-cantor';
import {positiveCantorArithmetic} from './positive-cantor';
import {equalBalancedDivisors, neutralBalancedDivisor, balancedMultipleFunctions} from './balanced-cantor-arithmetic';
import type {CantorFunctionFactor} from './cantor-arithmetic';
import type {PositivePolynomial} from './positive-polynomial';
import {finiteJacobianBound, verifyFiniteJacobianBound, factorPositiveInteger, verifyPositiveIntegerFactors, type FiniteJacobianBound, type IntegerPrimeFactor} from './reduced-divisor-order';
import {findFiniteClassOrderMultiple} from './finite-class-order-search';

export interface PositiveBalancedOrder<E> {
  readonly rule: 'finite-balanced-class-order-v1'; readonly input: PositiveBalancedDivisor<E>;
  readonly bound: FiniteJacobianBound; readonly order: bigint; readonly multiple: PositiveBalancedMultiple<E>;
  readonly functions: readonly CantorFunctionFactor<PositivePolynomial<E>>[]; readonly factors: readonly IntegerPrimeFactor[];
  readonly exclusions: readonly Readonly<{prime: bigint; multiple: PositiveBalancedMultiple<E>}>[];
}
function neutral<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>): PositiveBalancedDivisor<E> {
  ctx.allocate(14); return neutralBalancedDivisor(ctx, positiveCantorArithmetic(domain.ring), domain);
}
function equal<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, a: PositiveBalancedDivisor<E>, b: PositiveBalancedDivisor<E>): boolean {
  ctx.allocate(14); return equalBalancedDivisors(ctx, positiveCantorArithmetic(domain.ring), a, b);
}
function zero<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, p: PositiveBalancedDivisor<E>): boolean {return equal(ctx, domain, p, neutral(ctx, domain));}
function key<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, p: PositiveBalancedDivisor<E>): string {
  const text = (polynomial: PositivePolynomial<E>) => {
    ctx.allocate(polynomial.coefficients.length); const values: string[] = [];
    for (const value of polynomial.coefficients) {const index = domain.field.index(ctx, value).toString(); ctx.allocate(index.length); values.push(index);}
    const result = values.join(','); ctx.allocate(result.length); return result;
  };
  const weight = p.n.toString(); ctx.allocate(weight.length); const result = `${text(p.pair.u)}|${text(p.pair.v)}|${weight}`; ctx.allocate(result.length); return result;
}
export function verifyPositiveBalancedOrderWithin<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, proof: PositiveBalancedOrder<E>, bounds: DifferentialBounds): void {
  verifyPositiveBalancedDomainWithin(ctx, domain, bounds); verifyPositiveBalancedDivisorWithin(ctx, domain, input, bounds); verifyPositiveBalancedDivisorWithin(ctx, domain, proof.input, bounds);
  demand(proof.rule === 'finite-balanced-class-order-v1' && equal(ctx, domain, input, proof.input), 'verification-failed', 'complete finite balanced order request');
  verifyFiniteJacobianBound(ctx, domain.field.size, BigInt(domain.genus), proof.bound); ctx.integer(proof.order);
  demand(proof.order > 0n && proof.order <= proof.bound.upper, 'verification-failed', 'finite balanced order inside complete bound');
  verifyPositiveBalancedMultipleWithin(ctx, domain, input, proof.order, proof.multiple, bounds); demand(zero(ctx, domain, proof.multiple.result), 'verification-failed', 'finite balanced exact annihilator');
  const functions = balancedMultipleFunctions(ctx, proof.multiple);
  demand(functions.length === proof.functions.length && functions.every((f, i) => {ctx.integer(proof.functions[i].exponent);
    return f.kind === proof.functions[i].kind && f.exponent === proof.functions[i].exponent && domain.ring.equal(ctx, f.polynomial, proof.functions[i].polynomial);}), 'verification-failed', 'complete balanced principal function witness');
  verifyPositiveIntegerFactors(ctx, proof.order, proof.factors); demand(proof.exclusions.length === proof.factors.length, 'verification-failed', 'finite balanced minimal-order prime coverage');
  for (let i = 0; i < proof.factors.length; i++) {
    const prime = proof.factors[i].prime, exclusion = proof.exclusions[i]; demand(prime === exclusion.prime, 'verification-failed', 'finite balanced exact prime exclusion');
    verifyPositiveBalancedMultipleWithin(ctx, domain, input, ctx.quotient(proof.order, prime), exclusion.multiple, bounds);
    demand(!zero(ctx, domain, exclusion.multiple.result), 'verification-failed', 'finite balanced prime quotient is nonzero');
  }
}
export function decidePositiveBalancedOrderWithin<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, bounds: DifferentialBounds): PositiveBalancedOrder<E> {
  verifyPositiveBalancedDomainWithin(ctx, domain, bounds); verifyPositiveBalancedDivisorWithin(ctx, domain, input, bounds);
  const bound = finiteJacobianBound(ctx, domain.field.size, BigInt(domain.genus)); ctx.allocate(5);
  const candidate = findFiniteClassOrderMultiple(ctx, {neutral: () => neutral(ctx, domain), zero: p => zero(ctx, domain, p), equal: (a, b) => equal(ctx, domain, a, b),
    key: p => key(ctx, domain, p), add: (a, b) => addPositiveBalancedDivisorsWithin(ctx, domain, a, b, bounds).result}, input, bound);
  const primes = factorPositiveInteger(ctx, candidate); let order = candidate;
  for (const f of primes) for (let n = 0n; n < f.multiplicity; n = ctx.add(n, 1n)) {
    const quotient = ctx.quotient(order, f.prime), multiple = multiplyPositiveBalancedDivisorWithin(ctx, domain, input, quotient, bounds);
    if (!zero(ctx, domain, multiple.result)) break; order = quotient;
  }
  const multiple = multiplyPositiveBalancedDivisorWithin(ctx, domain, input, order, bounds), functions = balancedMultipleFunctions(ctx, multiple), factors = factorPositiveInteger(ctx, order);
  ctx.allocate(8 + 3 * factors.length); const proof = Object.freeze({rule: 'finite-balanced-class-order-v1' as const, input, bound, order, multiple, functions, factors,
    exclusions: Object.freeze(factors.map(f => Object.freeze({prime: f.prime, multiple: multiplyPositiveBalancedDivisorWithin(ctx, domain, input, ctx.quotient(order, f.prime), bounds)})))});
  verifyPositiveBalancedOrderWithin(ctx, domain, input, proof, bounds); return proof;
}
export function decidePositiveBalancedOrder<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => decidePositiveBalancedOrderWithin(ctx, domain, input, bounds));
}
export function verifyPositiveBalancedOrder<E>(ctx: ExecutionContext, domain: PositiveBalancedDomain<E>, input: PositiveBalancedDivisor<E>, proof: PositiveBalancedOrder<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyPositiveBalancedOrderWithin(ctx, domain, input, proof, bounds));
}
