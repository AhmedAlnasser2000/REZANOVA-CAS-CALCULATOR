/** Narrow Cantor identities. These operations confer no coefficient-field or
 * curve authority; each registered caller must establish its own hypotheses. */
import {demand, type ExecutionContext} from './execution';

export interface CantorCoefficients<E> {
  fromInteger(ctx: ExecutionContext, n: bigint): E;
  add(ctx: ExecutionContext, a: E, b: E): E;
  subtract(ctx: ExecutionContext, a: E, b: E): E;
  negate(ctx: ExecutionContext, a: E): E;
  multiply(ctx: ExecutionContext, a: E, b: E): E;
  equal(ctx: ExecutionContext, a: E, b: E): boolean;
  inverse(ctx: ExecutionContext, a: E): E;
}
export interface CantorBezout<P> {readonly gcd: P; readonly s: P; readonly t: P}
export interface CantorPolynomialArithmetic<E, P extends {readonly coefficients: readonly E[]}> {
  readonly domain: CantorCoefficients<E>;
  assert(ctx: ExecutionContext, p: P): void;
  make(ctx: ExecutionContext, coefficients: readonly E[]): P;
  zero(ctx: ExecutionContext): P;
  one(ctx: ExecutionContext): P;
  equal(ctx: ExecutionContext, a: P, b: P): boolean;
  scale(ctx: ExecutionContext, a: P, coefficient: E): P;
  add(ctx: ExecutionContext, a: P, b: P): P;
  subtract(ctx: ExecutionContext, a: P, b: P): P;
  negate(ctx: ExecutionContext, a: P): P;
  multiply(ctx: ExecutionContext, a: P, b: P): P;
  remainder(ctx: ExecutionContext, a: P, b: P): P;
  exactDivide(ctx: ExecutionContext, a: P, b: P): P;
  bezout(ctx: ExecutionContext, a: P, b: P): CantorBezout<P>;
  verifyBezout(ctx: ExecutionContext, a: P, b: P, proof: CantorBezout<P>): void;
}
export interface CantorPair<P> {readonly u: P; readonly v: P; readonly normQuotient: P}
export interface CantorComposition<P> {
  readonly left: CantorPair<P>;
  readonly right: CantorPair<P>;
  readonly common: CantorBezout<P>;
  readonly opposite: CantorBezout<P>;
  readonly leftQuotient: P;
  readonly rightQuotient: P;
  readonly result: CantorPair<P>;
}
export interface CantorReduction<P> {readonly input: CantorPair<P>; readonly result: CantorPair<P>}
export interface CantorAddition<P> {
  readonly composition: CantorComposition<P>;
  readonly reductions: readonly CantorReduction<P>[];
  readonly result: CantorPair<P>;
}
export interface CantorMultiple<P> {
  readonly input: CantorPair<P>;
  readonly coefficient: bigint;
  readonly base: CantorPair<P>;
  readonly steps: readonly Readonly<{double: CantorAddition<P>; add: CantorAddition<P> | null}>[];
  readonly result: CantorPair<P>;
}
export interface CantorFunctionFactor<P> {
  readonly kind: 'polynomial' | 'y-minus-polynomial';
  readonly polynomial: P;
  readonly exponent: bigint;
}
function degree<P extends {readonly coefficients: readonly unknown[]}>(p: P): number {return p.coefficients.length - 1;}
function productCoefficient<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, a: P, b: P, index: number): E {
  let value = r.domain.fromInteger(ctx, 0n);
  for (let j = Math.max(0, index - degree(b)); j <= Math.min(index, degree(a)); j++) {
    ctx.tick(); value = r.domain.add(ctx, value, r.domain.multiply(ctx, a.coefficients[j], b.coefficients[index - j]));
  }
  return value;
}
function normCoefficient<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, v: P, index: number): E {
  return r.domain.subtract(ctx, h.coefficients[index] ?? r.domain.fromInteger(ctx, 0n), productCoefficient(ctx, r, v, v, index));
}
/** Independent complete coefficient identity, without constructing v^2. */
export function verifyCantorPair<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, pair: CantorPair<P>): void {
  r.assert(ctx, h); r.assert(ctx, pair.u); r.assert(ctx, pair.v); r.assert(ctx, pair.normQuotient);
  const du = degree(pair.u), dv = degree(pair.v), n = Math.max(degree(h), 2 * dv);
  demand(du >= 0 && dv < du && r.domain.equal(ctx, pair.u.coefficients[du], r.domain.fromInteger(ctx, 1n))
    && degree(pair.normQuotient) === n - du, 'verification-failed', 'canonical Mumford coordinates/norm degree');
  verifyCantorNormQuotient(ctx, r, h, pair.u, pair.v, pair.normQuotient);
}
/** This identity also covers even-degree leading cancellation. Registered
 * odd/balanced callers enforce their different representation guards. */
export function verifyCantorNormQuotient<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, u: P, v: P, quotient: P): void {
  for (const p of [h, u, v, quotient]) r.assert(ctx, p);
  const du = degree(u), n = Math.max(degree(h), 2 * degree(v));
  demand(du >= 0 && degree(quotient) <= n - du && r.domain.equal(ctx, u.coefficients[du], r.domain.fromInteger(ctx, 1n)), 'verification-failed', 'monic norm quotient shape');
  for (let i = 0; i <= n; i++) {ctx.tick(); demand(r.domain.equal(ctx, normCoefficient(ctx, r, h, v, i), productCoefficient(ctx, r, u, quotient, i)), 'verification-failed', 'complete Mumford norm quotient');}
}
/** Monic division of the streamed expression H-v^2. Only the actual quotient
 * is allocated; its virtual numerator is never a disguised polynomial value. */
export function constructCantorPair<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, u: P, v: P): CantorPair<P> {
  demand(degree(v) < degree(u), 'invalid-input', 'canonical Mumford request');
  const normQuotient = cantorNormQuotient(ctx, r, h, u, v); ctx.allocate(3);
  const result = Object.freeze({u, v, normQuotient}); verifyCantorPair(ctx, r, h, result); return result;
}
export function cantorNormQuotient<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, u: P, v: P): P {
  r.assert(ctx, u); r.assert(ctx, v); r.assert(ctx, h);
  const du = degree(u), dv = degree(v), c = r.domain;
  demand(du >= 0 && c.equal(ctx, u.coefficients[du], c.fromInteger(ctx, 1n)), 'invalid-input', 'monic norm quotient request');
  const zero = c.fromInteger(ctx, 0n); let n = Math.max(degree(h), 2 * dv);
  while (n >= 0 && c.equal(ctx, normCoefficient(ctx, r, h, v, n), zero)) {ctx.tick(); n--;}
  if (n < 0) {const result = r.zero(ctx); verifyCantorNormQuotient(ctx, r, h, u, v, result); return result;}
  const dq = n - du;
  demand(dq >= 0, 'invalid-input', 'Mumford divisor exceeds norm degree'); ctx.degree(dq); ctx.allocate(dq + 1);
  const q: E[] = Array<E>(dq + 1).fill(zero);
  for (let k = n; k >= du; k--) {
    let value = normCoefficient(ctx, r, h, v, k);
    for (let j = Math.max(0, k - dq); j < du; j++) {
      ctx.tick(); value = c.subtract(ctx, value, c.multiply(ctx, u.coefficients[j], q[k - j]));
    }
    q[k - du] = value;
  }
  const result = r.make(ctx, q); verifyCantorNormQuotient(ctx, r, h, u, v, result); return result;
}
export function equalCantorPairs<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, a: CantorPair<P>, b: CantorPair<P>): boolean {
  return r.equal(ctx, a.u, b.u) && r.equal(ctx, a.v, b.v) && r.equal(ctx, a.normQuotient, b.normQuotient);
}
/** Exact multiplication in C[x]/u by Horner coefficient arithmetic. Truncated
 * scratch coordinates stay below deg(u); the quotient remains a ring. */
function multiplyModulo<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, a: P, b: P, u: P): P {
  const n = degree(u), c = r.domain; demand(n >= 0, 'invalid-input', 'nonzero Mumford modulus');
  if (n === 0) return r.zero(ctx);
  const reduced = r.remainder(ctx, b, u), zero = c.fromInteger(ctx, 0n); ctx.allocate(n); let values: E[] = Array<E>(n).fill(zero);
  for (let k = degree(a); k >= 0; k--) {
    ctx.allocate(n); const next: E[] = [], overflow = values[n - 1];
    for (let j = 0; j < n; j++) {
      ctx.tick(); next.push(c.add(ctx, c.subtract(ctx, j ? values[j - 1] : zero, c.multiply(ctx, overflow, u.coefficients[j])),
        c.multiply(ctx, a.coefficients[k], reduced.coefficients[j] ?? zero)));
    }
    values = next;
  }
  return r.make(ctx, values);
}
export function cantorCompositionValue<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, proof: CantorComposition<P>): P {
  const {left, right, common, opposite, rightQuotient, result} = proof, u = result.u;
  const s2 = multiplyModulo(ctx, r, opposite.s, common.t, u);
  const correction = r.add(ctx, multiplyModulo(ctx, r, s2, r.subtract(ctx, left.v, right.v), u),
    multiplyModulo(ctx, r, opposite.t, right.normQuotient, u));
  return r.remainder(ctx, r.add(ctx, r.remainder(ctx, right.v, u), multiplyModulo(ctx, r, rightQuotient, correction, u)), u);
}
export function verifyCantorComposition<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, genus: number, left: CantorPair<P>, right: CantorPair<P>, proof: CantorComposition<P>): void {
  verifyCantorPair(ctx, r, h, left); verifyCantorPair(ctx, r, h, right);
  demand(degree(left.u) <= genus && degree(right.u) <= genus && equalCantorPairs(ctx, r, left, proof.left)
    && equalCantorPairs(ctx, r, right, proof.right), 'verification-failed', 'reduced Cantor composition operands');
  r.verifyBezout(ctx, left.u, right.u, proof.common);
  r.verifyBezout(ctx, proof.common.gcd, r.add(ctx, left.v, right.v), proof.opposite);
  const d = proof.opposite.gcd;
  demand(r.equal(ctx, r.multiply(ctx, d, proof.leftQuotient), left.u) && r.equal(ctx, r.multiply(ctx, d, proof.rightQuotient), right.u)
    && r.equal(ctx, r.multiply(ctx, proof.leftQuotient, proof.rightQuotient), proof.result.u), 'verification-failed', 'complete Cantor cancellation quotients');
  verifyCantorPair(ctx, r, h, proof.result);
  demand(r.equal(ctx, cantorCompositionValue(ctx, r, proof), proof.result.v), 'verification-failed', 'Cantor coefficient/ideal-product congruence');
}
export function composeCantorPairs<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, genus: number, left: CantorPair<P>, right: CantorPair<P>): CantorComposition<P> {
  verifyCantorPair(ctx, r, h, left); verifyCantorPair(ctx, r, h, right);
  demand(degree(left.u) <= genus && degree(right.u) <= genus, 'invalid-input', 'reduced composition request');
  const common = r.bezout(ctx, left.u, right.u), opposite = r.bezout(ctx, common.gcd, r.add(ctx, left.v, right.v));
  const leftQuotient = r.exactDivide(ctx, left.u, opposite.gcd), rightQuotient = r.exactDivide(ctx, right.u, opposite.gcd), u = r.multiply(ctx, leftQuotient, rightQuotient);
  const placeholder = {left, right, common, opposite, leftQuotient, rightQuotient, result: {u, v: r.zero(ctx), normQuotient: r.zero(ctx)}};
  const v = cantorCompositionValue(ctx, r, placeholder), result = constructCantorPair(ctx, r, h, u, v);
  ctx.allocate(7); const proof = Object.freeze({...placeholder, result}); verifyCantorComposition(ctx, r, h, genus, left, right, proof); return proof;
}
export function verifyCantorReduction<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, genus: number, input: CantorPair<P>, proof: CantorReduction<P>): void {
  verifyCantorPair(ctx, r, h, input); verifyCantorPair(ctx, r, h, proof.result);
  const q = input.normQuotient, monic = r.scale(ctx, q, r.domain.inverse(ctx, q.coefficients[degree(q)]));
  demand(equalCantorPairs(ctx, r, input, proof.input) && degree(input.u) > genus && degree(proof.result.u) < degree(input.u)
    && r.equal(ctx, monic, proof.result.u) && r.equal(ctx, r.remainder(ctx, r.negate(ctx, input.v), monic), proof.result.v),
    'verification-failed', 'complete strictly decreasing Cantor reduction');
}
export function reduceCantorPair<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, genus: number, input: CantorPair<P>): CantorReduction<P> {
  verifyCantorPair(ctx, r, h, input); demand(degree(input.u) > genus, 'invalid-input', 'Cantor reduction degree');
  const q = input.normQuotient, u = r.scale(ctx, q, r.domain.inverse(ctx, q.coefficients[degree(q)]));
  const result = constructCantorPair(ctx, r, h, u, r.remainder(ctx, r.negate(ctx, input.v), u));
  ctx.allocate(2); const proof = Object.freeze({input, result}); verifyCantorReduction(ctx, r, h, genus, input, proof); return proof;
}
export function verifyCantorAddition<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, genus: number, left: CantorPair<P>, right: CantorPair<P>, proof: CantorAddition<P>): void {
  verifyCantorComposition(ctx, r, h, genus, left, right, proof.composition); let previous = proof.composition.result;
  for (const step of proof.reductions) {ctx.tick(); verifyCantorReduction(ctx, r, h, genus, previous, step); previous = step.result;}
  demand(degree(previous.u) <= genus && equalCantorPairs(ctx, r, previous, proof.result), 'verification-failed', 'complete Cantor reduction coverage');
}
export function addCantorPairs<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, genus: number, left: CantorPair<P>, right: CantorPair<P>): CantorAddition<P> {
  const composition = composeCantorPairs(ctx, r, h, genus, left, right), reductions: CantorReduction<P>[] = []; let result = composition.result;
  while (degree(result.u) > genus) {ctx.tick(); const step = reduceCantorPair(ctx, r, h, genus, result); ctx.allocate(1); reductions.push(step); result = step.result;}
  ctx.allocate(3); const proof = Object.freeze({composition, reductions: Object.freeze(reductions), result}); verifyCantorAddition(ctx, r, h, genus, left, right, proof); return proof;
}
function digits(ctx: ExecutionContext, coefficient: bigint): readonly boolean[] {
  ctx.integer(coefficient); let n = coefficient < 0n ? -coefficient : coefficient; const result: boolean[] = [];
  while (n) {ctx.allocate(1); result.push(ctx.remainder(n, 2n) !== 0n); n = ctx.quotient(n, 2n);} return result.reverse();
}
export function verifyCantorMultiple<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, genus: number, input: CantorPair<P>, coefficient: bigint, proof: CantorMultiple<P>): void {
  verifyCantorPair(ctx, r, h, input); ctx.integer(coefficient); ctx.allocate(3);
  const base = coefficient < 0n ? Object.freeze({...input, v: r.negate(ctx, input.v)}) : input;
  demand(degree(input.u) <= genus && proof.coefficient === coefficient && equalCantorPairs(ctx, r, input, proof.input)
    && equalCantorPairs(ctx, r, base, proof.base), 'verification-failed', 'signed Cantor multiplication request');
  const bits = degree(input.u) === 0 ? [] : digits(ctx, coefficient); demand(proof.steps.length === bits.length, 'verification-failed', 'complete Cantor binary coverage');
  ctx.allocate(3); let previous: CantorPair<P> = Object.freeze({u: r.one(ctx), v: r.zero(ctx), normQuotient: h});
  for (let i = 0; i < bits.length; i++) {
    const step = proof.steps[i]; verifyCantorAddition(ctx, r, h, genus, previous, previous, step.double); previous = step.double.result;
    if (bits[i]) {demand(step.add !== null, 'verification-failed', 'missing Cantor add bit'); verifyCantorAddition(ctx, r, h, genus, previous, proof.base, step.add); previous = step.add.result;}
    else demand(step.add === null, 'verification-failed', 'extra Cantor add bit');
  }
  demand(equalCantorPairs(ctx, r, previous, proof.result), 'verification-failed', 'Cantor multiple exact result');
}
export function multiplyCantorPair<E, P extends {readonly coefficients: readonly E[]}>(ctx: ExecutionContext,
  r: CantorPolynomialArithmetic<E, P>, h: P, genus: number, input: CantorPair<P>, coefficient: bigint): CantorMultiple<P> {
  verifyCantorPair(ctx, r, h, input); ctx.integer(coefficient); demand(degree(input.u) <= genus, 'invalid-input', 'reduced Cantor multiplication request');
  ctx.allocate(3); const base = coefficient < 0n ? Object.freeze({...input, v: r.negate(ctx, input.v)}) : input, steps: {double: CantorAddition<P>; add: CantorAddition<P> | null}[] = [];
  ctx.allocate(3); let result: CantorPair<P> = Object.freeze({u: r.one(ctx), v: r.zero(ctx), normQuotient: h});
  for (const bit of degree(input.u) === 0 ? [] : digits(ctx, coefficient)) {
    const double = addCantorPairs(ctx, r, h, genus, result, result); result = double.result;
    const add = bit ? addCantorPairs(ctx, r, h, genus, result, base) : null; if (add) result = add.result;
    ctx.allocate(3); steps.push(Object.freeze({double, add}));
  }
  ctx.allocate(5); const proof = Object.freeze({input, coefficient, base, steps: Object.freeze(steps), result}); verifyCantorMultiple(ctx, r, h, genus, input, coefficient, proof); return proof;
}
/** Formal exact function products associated with the retained class identity.
 * No polynomial factorization, expansion, branch identity or search occurs. */
export function cantorAdditionFunctions<P>(ctx: ExecutionContext, proof: CantorAddition<P>): readonly CantorFunctionFactor<P>[] {
  ctx.allocate(3 * (1 + 2 * proof.reductions.length));
  const factors: CantorFunctionFactor<P>[] = [Object.freeze({kind: 'polynomial', polynomial: proof.composition.opposite.gcd, exponent: 1n})];
  for (const step of proof.reductions) {
    factors.push(Object.freeze({kind: 'y-minus-polynomial', polynomial: step.input.v, exponent: 1n}),
      Object.freeze({kind: 'polynomial', polynomial: step.result.u, exponent: -1n}));
  }
  return Object.freeze(factors);
}
export function cantorMultipleFunctions<P>(ctx: ExecutionContext, proof: CantorMultiple<P>): readonly CantorFunctionFactor<P>[] {
  let factors: CantorFunctionFactor<P>[] = [];
  for (const step of proof.steps) {
    ctx.allocate(3 * factors.length); factors = factors.map(f => Object.freeze({...f, exponent: ctx.multiply(2n, f.exponent)}));
    const twice = cantorAdditionFunctions(ctx, step.double); ctx.allocate(twice.length); factors.push(...twice);
    if (step.add !== null) {const more = cantorAdditionFunctions(ctx, step.add); ctx.allocate(more.length); factors.push(...more);}
  }
  if (proof.coefficient < 0n) {ctx.allocate(3); factors.push(Object.freeze({kind: 'polynomial', polynomial: proof.input.u, exponent: proof.coefficient}));}
  return Object.freeze(factors);
}
