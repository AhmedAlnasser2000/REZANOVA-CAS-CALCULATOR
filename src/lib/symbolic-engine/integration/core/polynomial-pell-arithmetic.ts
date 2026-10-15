/** Narrow continued-fraction arithmetic shared by distinct registered domains.
 * This interface grants neither field nor mathematical decision authority. */
import {demand, type ExecutionContext} from './execution';
export interface PellPolynomialCoordinates<E> {readonly coefficients: readonly E[]}
export interface PellCoefficientArithmetic<E> {
  assert(ctx: ExecutionContext, value: E): void;
  fromInteger(ctx: ExecutionContext, value: bigint): E;
  add(ctx: ExecutionContext, a: E, b: E): E;
  subtract(ctx: ExecutionContext, a: E, b: E): E;
  multiply(ctx: ExecutionContext, a: E, b: E): E;
  exactDivide(ctx: ExecutionContext, a: E, b: E): E;
  equal(ctx: ExecutionContext, a: E, b: E): boolean;
  isZero(ctx: ExecutionContext, a: E): boolean;
}
export interface PellDivision<P> {readonly quotient: P; readonly remainder: P}
export interface PellBezout<P> {readonly gcd: P; readonly s: P; readonly t: P}
export interface PellPolynomialArithmetic<E, P extends PellPolynomialCoordinates<E>> {
  readonly domain: PellCoefficientArithmetic<E>;
  assert(ctx: ExecutionContext, value: P): void;
  make(ctx: ExecutionContext, coefficients: readonly E[]): P;
  zero(ctx: ExecutionContext): P;
  one(ctx: ExecutionContext): P;
  degree(ctx: ExecutionContext, value: P): number;
  leading(ctx: ExecutionContext, value: P): E;
  isZero(ctx: ExecutionContext, value: P): boolean;
  equal(ctx: ExecutionContext, a: P, b: P): boolean;
  add(ctx: ExecutionContext, a: P, b: P): P;
  subtract(ctx: ExecutionContext, a: P, b: P): P;
  negate(ctx: ExecutionContext, value: P): P;
  multiply(ctx: ExecutionContext, a: P, b: P): P;
  derivative(ctx: ExecutionContext, value: P): P;
  divide(ctx: ExecutionContext, a: P, b: P): PellDivision<P>;
  verifyDivision(ctx: ExecutionContext, a: P, b: P, proof: PellDivision<P>): void;
  bezout(ctx: ExecutionContext, a: P, b: P): PellBezout<P>;
  verifyBezout(ctx: ExecutionContext, a: P, b: P, proof: PellBezout<P>): void;
}
export interface PellArithmeticStep<P> {
  readonly offset: P; readonly denominator: P; readonly division: PellDivision<P>;
  readonly nextOffset: P; readonly nextDenominator: P;
  readonly numerator: P | null; readonly convergentDenominator: P | null; readonly norm: P | null;
}
export interface PellArithmeticDecision<E, P> {
  readonly rule: 'polynomial-pell-bounded-cf-v1'; readonly input: P; readonly maximumDegree: bigint;
  readonly squareFree: PellBezout<P>; readonly polynomialPart: P; readonly steps: readonly PellArithmeticStep<P>[];
  readonly kind: 'unit' | 'bounded-empty'; readonly numerator: P | null; readonly denominator: P | null;
  readonly norm: E | null; readonly leastDegree: bigint | null;
}
function polynomialPart<E, P extends PellPolynomialCoordinates<E>>(ctx: ExecutionContext, r: PellPolynomialArithmetic<E, P>, h: P, m: number): P {
  const c = r.domain; ctx.allocate(m + 1); const cs = Array<E>(m + 1).fill(c.fromInteger(ctx, 0n)); cs[m] = c.fromInteger(ctx, 1n);
  for (let k = m - 1; k >= 0; k--) {
    let sum = c.fromInteger(ctx, 0n);
    for (let i = k; i <= m; i++) {
      const j = m + k - i; sum = c.add(ctx, sum, c.multiply(ctx, cs[i], cs[j]));
    }
    cs[k] = c.exactDivide(ctx, c.subtract(ctx, h.coefficients[m + k] ?? c.fromInteger(ctx, 0n), sum), c.fromInteger(ctx, 2n));
  }
  return r.make(ctx, cs);
}
/** Check the norm coefficientwise. Never manufacture polynomials of degree
 * twice that of the returned unit merely to verify cancellation. */
function verifyNorm<E, P extends PellPolynomialCoordinates<E>>(ctx: ExecutionContext, r: PellPolynomialArithmetic<E, P>, h: P, p: P, q: P, norm: P): void {
  for (const v of [h, p, q, norm]) r.assert(ctx, v); const c = r.domain;
  const size = Math.max(norm.coefficients.length, 2 * p.coefficients.length - 1, h.coefficients.length + 2 * q.coefficients.length - 2);
  demand(Number.isSafeInteger(size), 'invalid-input', 'Pell norm coefficient coverage');
  for (let k = 0; k < size; k++) {
    ctx.tick(); let value = c.fromInteger(ctx, 0n);
    for (let i = Math.max(0, k + 1 - p.coefficients.length); i <= Math.min(k, p.coefficients.length - 1); i++)
      value = c.add(ctx, value, c.multiply(ctx, p.coefficients[i], p.coefficients[k - i]));
    for (let j = 0; j <= Math.min(k, h.coefficients.length - 1); j++) {
      let coefficient = c.fromInteger(ctx, 0n); const power = k - j;
      for (let i = Math.max(0, power + 1 - q.coefficients.length); i <= Math.min(power, q.coefficients.length - 1); i++)
        coefficient = c.add(ctx, coefficient, c.multiply(ctx, q.coefficients[i], q.coefficients[power - i]));
      value = c.subtract(ctx, value, c.multiply(ctx, h.coefficients[j], coefficient));
    }
    demand(c.equal(ctx, value, norm.coefficients[k] ?? c.fromInteger(ctx, 0n)), 'verification-failed', 'complete independent Pell norm identity');
  }
}
export function verifyPellArithmetic<E, P extends PellPolynomialCoordinates<E>>(ctx: ExecutionContext, r: PellPolynomialArithmetic<E, P>, h: P, maximumDegree: bigint, proof: PellArithmeticDecision<E, P>, m: number): void {
  const c = r.domain;
  demand(proof.rule === 'polynomial-pell-bounded-cf-v1' && proof.maximumDegree === maximumDegree && r.equal(ctx, h, proof.input), 'verification-failed', 'Pell complete explicit request');
  r.verifyBezout(ctx, h, r.derivative(ctx, h), proof.squareFree); demand(r.equal(ctx, proof.squareFree.gcd, r.one(ctx)), 'verification-failed', 'square-free Pell polynomial');
  const a0 = proof.polynomialPart; r.assert(ctx, a0);
  demand(r.degree(ctx, a0) === m && c.equal(ctx, r.leading(ctx, a0), c.fromInteger(ctx, 1n)) && r.degree(ctx, r.subtract(ctx, h, r.multiply(ctx, a0, a0))) < m, 'verification-failed', 'complete formal square-root polynomial part');
  if (maximumDegree < BigInt(m)) {
    demand(proof.kind === 'bounded-empty' && !proof.steps.length && proof.numerator === null && proof.denominator === null && proof.norm === null && proof.leastDegree === null, 'verification-failed', 'universal Pell degree lower bound'); return;
  }
  demand(proof.steps.length > 0, 'verification-failed', 'Pell continued-fraction coverage');
  let offset = r.zero(ctx), denominator = r.one(ctx), previousP = r.one(ctx), previousPreviousP = r.zero(ctx), previousQ = r.zero(ctx), previousPreviousQ = r.one(ctx);
  let cut = false, terminal: PellArithmeticStep<P> | null = null;
  for (let i = 0; i < proof.steps.length; i++) {
    const s = proof.steps[i]; demand(r.equal(ctx, s.offset, offset) && r.equal(ctx, s.denominator, denominator) && !r.isZero(ctx, denominator), 'verification-failed', 'ordered Pell complete quotient');
    r.verifyDivision(ctx, r.add(ctx, a0, offset), denominator, s.division); const a = s.division.quotient;
    demand(!r.isZero(ctx, a) && (i === 0 || r.degree(ctx, a) > 0) && r.equal(ctx, s.nextOffset, r.subtract(ctx, r.multiply(ctx, a, denominator), offset))
      && r.equal(ctx, r.multiply(ctx, denominator, s.nextDenominator), r.subtract(ctx, h, r.multiply(ctx, s.nextOffset, s.nextOffset)))
      && !r.isZero(ctx, s.nextDenominator) && r.degree(ctx, s.nextDenominator) < m, 'verification-failed', 'Pell exact norm transition');
    const degree = r.degree(ctx, a) + r.degree(ctx, previousP);
    if (BigInt(degree) > maximumDegree) {
      demand(i === proof.steps.length - 1 && s.numerator === null && s.convergentDenominator === null && s.norm === null && proof.kind === 'bounded-empty', 'verification-failed', 'complete Pell degree cut'); cut = true; break;
    }
    demand(s.numerator !== null && s.convergentDenominator !== null && s.norm !== null, 'verification-failed', 'missing Pell convergent');
    const p = r.add(ctx, r.multiply(ctx, a, previousP), previousPreviousP), q = r.add(ctx, r.multiply(ctx, a, previousQ), previousPreviousQ);
    demand(r.equal(ctx, p, s.numerator) && r.equal(ctx, q, s.convergentDenominator) && r.degree(ctx, p) === degree && r.degree(ctx, p) > r.degree(ctx, previousP)
      && r.degree(ctx, p) === r.degree(ctx, q) + m && !r.isZero(ctx, q), 'verification-failed', 'Pell convergent strict progress/reconstruction');
    const norm = i % 2 === 0 ? r.negate(ctx, s.nextDenominator) : s.nextDenominator;
    demand(r.equal(ctx, norm, s.norm), 'verification-failed', 'Pell indexed norm sign'); verifyNorm(ctx, r, h, p, q, norm);
    if (r.degree(ctx, norm) === 0) {demand(i === proof.steps.length - 1 && proof.kind === 'unit', 'verification-failed', 'first Pell unit coverage'); terminal = s; break;}
    previousPreviousP = previousP; previousP = p; previousPreviousQ = previousQ; previousQ = q; offset = s.nextOffset; denominator = s.nextDenominator;
  }
  if (proof.kind === 'unit') {
    demand(terminal !== null && proof.numerator !== null && proof.denominator !== null && proof.norm !== null && proof.leastDegree !== null
      && r.equal(ctx, proof.numerator, terminal.numerator!) && r.equal(ctx, proof.denominator, terminal.convergentDenominator!)
      && c.equal(ctx, proof.norm, terminal.norm!.coefficients[0]) && !c.isZero(ctx, proof.norm) && proof.leastDegree === BigInt(r.degree(ctx, proof.numerator)), 'verification-failed', 'least-degree constant-norm Pell unit');
  } else demand(proof.kind === 'bounded-empty' && cut && proof.numerator === null && proof.denominator === null && proof.norm === null && proof.leastDegree === null, 'verification-failed', 'complete bounded Pell absence');
}
export function solvePellArithmetic<E, P extends PellPolynomialCoordinates<E>>(ctx: ExecutionContext, r: PellPolynomialArithmetic<E, P>, h: P, maximumDegree: bigint, m: number): PellArithmeticDecision<E, P> {
  const squareFree = r.bezout(ctx, h, r.derivative(ctx, h));
  demand(r.equal(ctx, squareFree.gcd, r.one(ctx)), 'invalid-input', 'square-free Pell input required'); const a0 = polynomialPart(ctx, r, h, m), steps: PellArithmeticStep<P>[] = [];
  const common = {rule: 'polynomial-pell-bounded-cf-v1' as const, input: h, maximumDegree, squareFree, polynomialPart: a0};
  const empty = (): PellArithmeticDecision<E, P> => Object.freeze({...common, steps: Object.freeze(steps), kind: 'bounded-empty' as const, numerator: null, denominator: null, norm: null, leastDegree: null});
  if (maximumDegree < BigInt(m)) {const proof = empty(); verifyPellArithmetic(ctx, r, h, maximumDegree, proof, m); return proof;}
  let offset = r.zero(ctx), denominator = r.one(ctx), previousP = r.one(ctx), previousPreviousP = r.zero(ctx), previousQ = r.zero(ctx), previousPreviousQ = r.one(ctx);
  for (;;) {
    const division = r.divide(ctx, r.add(ctx, a0, offset), denominator), a = division.quotient, nextOffset = r.subtract(ctx, r.multiply(ctx, a, denominator), offset);
    demand(!r.isZero(ctx, a) && (steps.length === 0 || r.degree(ctx, a) > 0), 'verification-failed', 'Pell partial-quotient progress');
    const next = r.divide(ctx, r.subtract(ctx, h, r.multiply(ctx, nextOffset, nextOffset)), denominator);
    demand(r.isZero(ctx, next.remainder), 'verification-failed', 'exact Pell denominator division'); const nextDenominator = next.quotient;
    demand(!r.isZero(ctx, nextDenominator) && r.degree(ctx, nextDenominator) < m, 'verification-failed', 'Pell complete-quotient degree bound');
    const degree = r.degree(ctx, a) + r.degree(ctx, previousP);
    if (BigInt(degree) > maximumDegree) {
      ctx.allocate(9); steps.push(Object.freeze({offset, denominator, division, nextOffset, nextDenominator, numerator: null, convergentDenominator: null, norm: null}));
      const proof = empty(); verifyPellArithmetic(ctx, r, h, maximumDegree, proof, m); return proof;
    }
    const p = r.add(ctx, r.multiply(ctx, a, previousP), previousPreviousP), q = r.add(ctx, r.multiply(ctx, a, previousQ), previousPreviousQ), norm = steps.length % 2 === 0 ? r.negate(ctx, nextDenominator) : nextDenominator;
    ctx.allocate(9); steps.push(Object.freeze({offset, denominator, division, nextOffset, nextDenominator, numerator: p, convergentDenominator: q, norm}));
    if (r.degree(ctx, norm) === 0) {
      ctx.allocate(10); const proof = Object.freeze({...common, steps: Object.freeze(steps), kind: 'unit' as const, numerator: p, denominator: q, norm: norm.coefficients[0], leastDegree: BigInt(r.degree(ctx, p))});
      verifyPellArithmetic(ctx, r, h, maximumDegree, proof, m); return proof;
    }
    previousPreviousP = previousP; previousP = p; previousPreviousQ = previousQ; previousQ = q; offset = nextOffset; denominator = nextDenominator;
  }
}
