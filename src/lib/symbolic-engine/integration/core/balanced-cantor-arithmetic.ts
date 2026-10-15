/** Characteristic-neutral balanced identities; callers certify split models. */
import {demand, type ExecutionContext} from './execution';
import {cantorNormQuotient, verifyCantorNormQuotient, cantorCompositionValue, equalCantorPairs,
  type CantorPolynomialArithmetic, type CantorPair, type CantorComposition, type CantorFunctionFactor} from './cantor-arithmetic';

export interface BalancedModel<P> {readonly polynomial: P; readonly plus: P; readonly minus: P; readonly genus: number}
export interface BalancedDivisor<P> {readonly pair: CantorPair<P>; readonly n: bigint}
export interface BalancedFlip<P> {
  readonly method: 'ordinary' | 'plus' | 'minus'; readonly input: CantorPair<P>; readonly interpolation: P;
  readonly normQuotient: P; readonly result: CantorPair<P>; readonly plus: bigint; readonly minus: bigint;
}
export interface BalancedNormalization<P> {
  readonly input: CantorPair<P>; readonly n: bigint; readonly ordinary: readonly BalancedFlip<P>[];
  readonly infinity: readonly BalancedFlip<P>[]; readonly result: BalancedDivisor<P>;
}
export interface BalancedAddition<P> {readonly composition: CantorComposition<P>; readonly normalization: BalancedNormalization<P>; readonly result: BalancedDivisor<P>}
export interface BalancedInverse<P> {readonly input: BalancedDivisor<P>; readonly normalization: BalancedNormalization<P>; readonly result: BalancedDivisor<P>}
export interface BalancedMultiple<P> {readonly input: BalancedDivisor<P>; readonly coefficient: bigint; readonly inverse: BalancedInverse<P> | null;
  readonly steps: readonly Readonly<{double: BalancedAddition<P>; add: BalancedAddition<P> | null}>[]; readonly result: BalancedDivisor<P>}
function degree<P extends {readonly coefficients: readonly unknown[]}>(p: P): number {return p.coefficients.length - 1;}
function a(ctx: ExecutionContext, genus: number): bigint {ctx.tick(); return BigInt(Math.ceil(genus / 2));}
function remaining<P extends {readonly coefficients: readonly unknown[]}>(ctx: ExecutionContext, m: BalancedModel<P>, p: CantorPair<P>, n: bigint): bigint {
  return ctx.add(ctx.add(BigInt(m.genus), -BigInt(degree(p.u))), -n);
}
export function verifyBalancedPair<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, p: CantorPair<P>): void {
  verifyCantorNormQuotient(ctx, r, m.polynomial, p.u, p.v, p.normQuotient);
  demand(degree(p.v) < degree(p.u) && degree(p.normQuotient) >= 0, 'verification-failed', 'balanced semireduced pair');
}
export function constructBalancedPair<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, u: P, v: P): CantorPair<P> {
  const normQuotient = cantorNormQuotient(ctx, r, m.polynomial, u, v); ctx.allocate(3); const p = Object.freeze({u, v, normQuotient}); verifyBalancedPair(ctx, r, m, p); return p;
}
export function verifyBalancedDivisor<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, p: BalancedDivisor<P>): void {
  verifyBalancedPair(ctx, r, m, p.pair); ctx.integer(p.n);
  demand(degree(p.pair.u) <= m.genus && p.n >= 0n && remaining(ctx, m, p.pair, p.n) >= 0n, 'verification-failed', 'canonical balanced infinity weights');
}
export function equalBalancedDivisors<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, x: BalancedDivisor<P>, y: BalancedDivisor<P>): boolean {
  return x.n === y.n && equalCantorPairs(ctx, r, x.pair, y.pair);
}
export function neutralBalancedDivisor<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>): BalancedDivisor<P> {
  ctx.allocate(5); return Object.freeze({pair: Object.freeze({u: r.one(ctx), v: r.zero(ctx), normQuotient: m.polynomial}), n: a(ctx, m.genus)});
}
function flipWeights<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, input: CantorPair<P>, v: P, result: CantorPair<P>): readonly [bigint, bigint] {
  const du = BigInt(degree(input.u)), next = BigInt(degree(result.u)), half = BigInt(m.genus + 1), dv = degree(v), leading = v.coefficients[dv];
  if (dv === m.genus + 1 && r.domain.equal(ctx, leading, m.plus.coefficients[dv])) {ctx.allocate(2); return [ctx.add(du, -half), ctx.add(half, -next)];}
  if (dv === m.genus + 1 && r.domain.equal(ctx, leading, m.minus.coefficients[dv])) {ctx.allocate(2); return [ctx.add(half, -next), ctx.add(du, -half)];}
  const difference = ctx.add(du, -next); demand(difference % 2n === 0n, 'verification-failed', 'balanced equal counterweight parity'); const value = ctx.quotient(difference, 2n); ctx.allocate(2); return [value, value];
}
export function verifyBalancedFlip<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, input: CantorPair<P>, p: BalancedFlip<P>): void {
  verifyBalancedPair(ctx, r, m, input); verifyBalancedPair(ctx, r, m, p.result);
  demand(equalCantorPairs(ctx, r, input, p.input), 'verification-failed', 'balanced flip exact input'); const du = degree(input.u);
  if (p.method === 'ordinary') demand(du > m.genus + 1 && r.equal(ctx, p.interpolation, input.v) && degree(p.result.u) < du, 'verification-failed', 'strict ordinary balanced reduction');
  else {
    demand((p.method === 'plus' || p.method === 'minus') && du <= m.genus + 1, 'verification-failed', 'balanced infinity flip method');
    const h = p.method === 'plus' ? m.plus : m.minus, v = r.add(ctx, h, r.remainder(ctx, r.subtract(ctx, input.v, h), input.u));
    demand(r.equal(ctx, v, p.interpolation) && degree(p.result.u) <= m.genus, 'verification-failed', 'complete infinity interpolation/degree');
  }
  verifyCantorNormQuotient(ctx, r, m.polynomial, input.u, p.interpolation, p.normQuotient);
  const dq = degree(p.normQuotient); demand(dq >= 0, 'verification-failed', 'nonzero balanced flip norm');
  const u = r.scale(ctx, p.normQuotient, r.domain.inverse(ctx, p.normQuotient.coefficients[dq]));
  demand(r.equal(ctx, u, p.result.u) && r.equal(ctx, r.remainder(ctx, r.negate(ctx, p.interpolation), u), p.result.v), 'verification-failed', 'balanced exact flip result');
  const [plus, minus] = flipWeights(ctx, r, m, input, p.interpolation, p.result);
  demand(p.plus === plus && p.minus === minus && ctx.add(plus, minus) === BigInt(du - degree(p.result.u)), 'verification-failed', 'balanced complete infinity counterweights');
}
function flip<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, input: CantorPair<P>, method: BalancedFlip<P>['method']): BalancedFlip<P> {
  const h = method === 'plus' ? m.plus : m.minus, interpolation = method === 'ordinary' ? input.v : r.add(ctx, h, r.remainder(ctx, r.subtract(ctx, input.v, h), input.u));
  const normQuotient = cantorNormQuotient(ctx, r, m.polynomial, input.u, interpolation), dq = degree(normQuotient); demand(dq >= 0, 'verification-failed', 'nonzero balanced smooth norm');
  const u = r.scale(ctx, normQuotient, r.domain.inverse(ctx, normQuotient.coefficients[dq])), result = constructBalancedPair(ctx, r, m, u, r.remainder(ctx, r.negate(ctx, interpolation), u));
  const [plus, minus] = flipWeights(ctx, r, m, input, interpolation, result); ctx.allocate(7); const p = Object.freeze({method, input, interpolation, normQuotient, result, plus, minus}); verifyBalancedFlip(ctx, r, m, input, p); return p;
}
function method<P extends {readonly coefficients: readonly unknown[]}>(ctx: ExecutionContext, m: BalancedModel<P>, pair: CantorPair<P>, n: bigint): 'plus' | 'minus' {
  return n > remaining(ctx, m, pair, n) ? 'plus' : 'minus';
}
function progress<P extends {readonly coefficients: readonly unknown[]}>(ctx: ExecutionContext, m: BalancedModel<P>, input: CantorPair<P>, n: bigint, p: BalancedFlip<P>, next: bigint): void {
  const before = remaining(ctx, m, input, n), after = remaining(ctx, m, p.result, next), minimum = n < before ? n : before, newMinimum = next < after ? next : after;
  // Once the affine degree is <=g+1, the selected flip promotes the deficient
  // infinity side. If it overshoots the difference, both sides are balanced.
  demand(newMinimum > minimum || next >= 0n && after >= 0n, 'verification-failed', 'strict balanced infinity progress');
}
export function verifyBalancedNormalization<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, input: CantorPair<P>, n: bigint, p: BalancedNormalization<P>): void {
  verifyBalancedPair(ctx, r, m, input); ctx.integer(n); demand(equalCantorPairs(ctx, r, input, p.input) && p.n === n, 'verification-failed', 'balanced normalization exact request');
  let pair = input, weight = n;
  for (const step of p.ordinary) {verifyBalancedFlip(ctx, r, m, pair, step); demand(step.method === 'ordinary', 'verification-failed', 'ordinary step coverage'); weight = ctx.add(weight, step.plus); pair = step.result;}
  demand(degree(pair.u) <= m.genus + 1, 'verification-failed', 'complete ordinary degree reduction');
  for (const step of p.infinity) {
    demand(weight < 0n || remaining(ctx, m, pair, weight) < 0n, 'verification-failed', 'unnecessary infinity reduction');
    verifyBalancedFlip(ctx, r, m, pair, step); demand(step.method === method(ctx, m, pair, weight), 'verification-failed', 'balanced infinity sign');
    const next = ctx.add(weight, step.plus); progress(ctx, m, pair, weight, step, next); weight = next; pair = step.result;
  }
  verifyBalancedDivisor(ctx, r, m, p.result); demand(p.result.n === weight && equalCantorPairs(ctx, r, pair, p.result.pair), 'verification-failed', 'complete balanced normalization result');
}
export function normalizeBalancedDivisor<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, input: CantorPair<P>, n: bigint): BalancedNormalization<P> {
  verifyBalancedPair(ctx, r, m, input); ctx.integer(n); let pair = input, weight = n; const ordinary: BalancedFlip<P>[] = [], infinity: BalancedFlip<P>[] = [];
  while (degree(pair.u) > m.genus + 1) {const p = flip(ctx, r, m, pair, 'ordinary'); ctx.allocate(1); ordinary.push(p); weight = ctx.add(weight, p.plus); pair = p.result;}
  while (weight < 0n || remaining(ctx, m, pair, weight) < 0n) {
    const p = flip(ctx, r, m, pair, method(ctx, m, pair, weight)), next = ctx.add(weight, p.plus); progress(ctx, m, pair, weight, p, next);
    ctx.allocate(1); infinity.push(p); weight = next; pair = p.result;
  }
  ctx.allocate(7); const proof = Object.freeze({input, n, ordinary: Object.freeze(ordinary), infinity: Object.freeze(infinity), result: Object.freeze({pair, n: weight})}); verifyBalancedNormalization(ctx, r, m, input, n, proof); return proof;
}
function verifyComposition<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, left: CantorPair<P>, right: CantorPair<P>, p: CantorComposition<P>): void {
  verifyBalancedPair(ctx, r, m, left); verifyBalancedPair(ctx, r, m, right); verifyBalancedPair(ctx, r, m, p.result);
  demand(equalCantorPairs(ctx, r, left, p.left) && equalCantorPairs(ctx, r, right, p.right), 'verification-failed', 'balanced composition exact operands');
  r.verifyBezout(ctx, left.u, right.u, p.common); r.verifyBezout(ctx, p.common.gcd, r.add(ctx, left.v, right.v), p.opposite);
  const d = p.opposite.gcd;
  demand(r.equal(ctx, r.multiply(ctx, d, p.leftQuotient), left.u) && r.equal(ctx, r.multiply(ctx, d, p.rightQuotient), right.u)
    && r.equal(ctx, r.multiply(ctx, p.leftQuotient, p.rightQuotient), p.result.u) && r.equal(ctx, cantorCompositionValue(ctx, r, p), p.result.v), 'verification-failed', 'balanced complete composition correspondence');
}
export function verifyBalancedAddition<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, left: BalancedDivisor<P>, right: BalancedDivisor<P>, p: BalancedAddition<P>): void {
  verifyBalancedDivisor(ctx, r, m, left); verifyBalancedDivisor(ctx, r, m, right); verifyComposition(ctx, r, m, left.pair, right.pair, p.composition);
  const weight = ctx.add(ctx.add(ctx.add(left.n, right.n), -a(ctx, m.genus)), BigInt(degree(p.composition.opposite.gcd)));
  verifyBalancedNormalization(ctx, r, m, p.composition.result, weight, p.normalization);
  demand(equalBalancedDivisors(ctx, r, p.result, p.normalization.result), 'verification-failed', 'balanced sum complete result');
}
export function addBalancedDivisors<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, left: BalancedDivisor<P>, right: BalancedDivisor<P>): BalancedAddition<P> {
  verifyBalancedDivisor(ctx, r, m, left); verifyBalancedDivisor(ctx, r, m, right);
  const common = r.bezout(ctx, left.pair.u, right.pair.u), opposite = r.bezout(ctx, common.gcd, r.add(ctx, left.pair.v, right.pair.v));
  const leftQuotient = r.exactDivide(ctx, left.pair.u, opposite.gcd), rightQuotient = r.exactDivide(ctx, right.pair.u, opposite.gcd), u = r.multiply(ctx, leftQuotient, rightQuotient);
  const placeholder = {left: left.pair, right: right.pair, common, opposite, leftQuotient, rightQuotient, result: {u, v: r.zero(ctx), normQuotient: r.zero(ctx)}};
  const composition = Object.freeze({...placeholder, result: constructBalancedPair(ctx, r, m, u, cantorCompositionValue(ctx, r, placeholder))});
  const weight = ctx.add(ctx.add(ctx.add(left.n, right.n), -a(ctx, m.genus)), BigInt(degree(opposite.gcd))), normalization = normalizeBalancedDivisor(ctx, r, m, composition.result, weight);
  ctx.allocate(10); const proof = Object.freeze({composition, normalization, result: normalization.result}); verifyBalancedAddition(ctx, r, m, left, right, proof); return proof;
}
export function verifyBalancedInverse<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, input: BalancedDivisor<P>, p: BalancedInverse<P>): void {
  verifyBalancedDivisor(ctx, r, m, input); demand(equalBalancedDivisors(ctx, r, input, p.input), 'verification-failed', 'balanced inverse original input');
  const pair = p.normalization.input, weight = ctx.add(ctx.add(ctx.multiply(2n, a(ctx, m.genus)), -BigInt(degree(input.pair.u))), -input.n);
  demand(r.equal(ctx, pair.u, input.pair.u) && r.equal(ctx, pair.v, r.negate(ctx, input.pair.v)), 'verification-failed', 'balanced inverse conjugate');
  verifyBalancedNormalization(ctx, r, m, pair, weight, p.normalization); demand(equalBalancedDivisors(ctx, r, p.result, p.normalization.result), 'verification-failed', 'balanced inverse result');
}
export function inverseBalancedDivisor<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, input: BalancedDivisor<P>): BalancedInverse<P> {
  verifyBalancedDivisor(ctx, r, m, input); const pair = constructBalancedPair(ctx, r, m, input.pair.u, r.negate(ctx, input.pair.v)), n = ctx.add(ctx.add(ctx.multiply(2n, a(ctx, m.genus)), -BigInt(degree(input.pair.u))), -input.n), normalization = normalizeBalancedDivisor(ctx, r, m, pair, n);
  ctx.allocate(3); const p = Object.freeze({input, normalization, result: normalization.result}); verifyBalancedInverse(ctx, r, m, input, p); return p;
}
function bits(ctx: ExecutionContext, coefficient: bigint): readonly boolean[] {
  ctx.integer(coefficient); let n = coefficient < 0n ? -coefficient : coefficient; const values: boolean[] = [];
  while (n) {ctx.allocate(1); values.push(ctx.remainder(n, 2n) !== 0n); n = ctx.quotient(n, 2n);}
  return values.reverse();
}
export function verifyBalancedMultiple<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, input: BalancedDivisor<P>, coefficient: bigint, p: BalancedMultiple<P>): void {
  verifyBalancedDivisor(ctx, r, m, input); ctx.integer(coefficient);
  demand(p.coefficient === coefficient && equalBalancedDivisors(ctx, r, input, p.input), 'verification-failed', 'balanced exact signed request');
  let base = input;
  if (coefficient < 0n) {demand(p.inverse !== null, 'verification-failed', 'missing balanced inverse'); verifyBalancedInverse(ctx, r, m, input, p.inverse); base = p.inverse.result;}
  else demand(p.inverse === null, 'verification-failed', 'extra balanced inverse');
  const digits = bits(ctx, coefficient); demand(p.steps.length === digits.length, 'verification-failed', 'complete balanced binary coverage');
  let result = neutralBalancedDivisor(ctx, r, m);
  for (let i = 0; i < digits.length; i++) {
    const step = p.steps[i]; verifyBalancedAddition(ctx, r, m, result, result, step.double); result = step.double.result;
    if (digits[i]) {demand(step.add !== null, 'verification-failed', 'missing balanced add bit'); verifyBalancedAddition(ctx, r, m, result, base, step.add); result = step.add.result;}
    else demand(step.add === null, 'verification-failed', 'extra balanced add bit');
  }
  demand(equalBalancedDivisors(ctx, r, result, p.result), 'verification-failed', 'balanced complete multiple result');
}
export function multiplyBalancedDivisor<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext, r: CantorPolynomialArithmetic<E, P>, m: BalancedModel<P>, input: BalancedDivisor<P>, coefficient: bigint): BalancedMultiple<P> {
  verifyBalancedDivisor(ctx, r, m, input); ctx.integer(coefficient);
  const inverse = coefficient < 0n ? inverseBalancedDivisor(ctx, r, m, input) : null, base = inverse?.result ?? input;
  const steps: {double: BalancedAddition<P>; add: BalancedAddition<P> | null}[] = []; let result = neutralBalancedDivisor(ctx, r, m);
  for (const bit of bits(ctx, coefficient)) {
    const double = addBalancedDivisors(ctx, r, m, result, result); result = double.result;
    const add = bit ? addBalancedDivisors(ctx, r, m, result, base) : null; if (add) result = add.result;
    ctx.allocate(3); steps.push(Object.freeze({double, add}));
  }
  ctx.allocate(5); const p = Object.freeze({input, coefficient, inverse, steps: Object.freeze(steps), result}); verifyBalancedMultiple(ctx, r, m, input, coefficient, p); return p;
}
/** Function identities use y=v for the affine Mumford support. Counterweights
 * are retained by the normalization; no polynomial powers are expanded. */
export function balancedNormalizationFunctions<P>(ctx: ExecutionContext, p: BalancedNormalization<P>): readonly CantorFunctionFactor<P>[] {
  ctx.allocate(6 * (p.ordinary.length + p.infinity.length)); const factors: CantorFunctionFactor<P>[] = [];
  for (const steps of [p.ordinary, p.infinity]) for (const step of steps) factors.push(
    Object.freeze({kind: 'y-minus-polynomial', polynomial: step.interpolation, exponent: 1n}),
    Object.freeze({kind: 'polynomial', polynomial: step.result.u, exponent: -1n}));
  return Object.freeze(factors);
}
export function balancedAdditionFunctions<P>(ctx: ExecutionContext, p: BalancedAddition<P>): readonly CantorFunctionFactor<P>[] {
  const factors = balancedNormalizationFunctions(ctx, p.normalization); ctx.allocate(4 + factors.length);
  return Object.freeze([Object.freeze({kind: 'polynomial' as const, polynomial: p.composition.opposite.gcd, exponent: 1n}), ...factors]);
}
export function balancedMultipleFunctions<P>(ctx: ExecutionContext, p: BalancedMultiple<P>): readonly CantorFunctionFactor<P>[] {
  let factors: CantorFunctionFactor<P>[] = []; let degree = 0n;
  for (const step of p.steps) {
    ctx.allocate(3 * factors.length); factors = factors.map(f => Object.freeze({...f, exponent: ctx.multiply(2n, f.exponent)})); degree = ctx.multiply(degree, 2n);
    const more = balancedAdditionFunctions(ctx, step.double); ctx.allocate(more.length); factors.push(...more);
    if (step.add) {const extra = balancedAdditionFunctions(ctx, step.add); ctx.allocate(extra.length); factors.push(...extra); degree = ctx.add(degree, 1n);}
  }
  if (p.inverse) {
    const extra = balancedNormalizationFunctions(ctx, p.inverse.normalization); ctx.allocate(3 * extra.length + 3);
    // input + inverse = div(u/input-normalization-function).
    factors.push(Object.freeze({kind: 'polynomial', polynomial: p.input.pair.u, exponent: -degree}));
    for (const f of extra) factors.push(Object.freeze({...f, exponent: ctx.multiply(degree, f.exponent)}));
  }
  return Object.freeze(factors);
}
