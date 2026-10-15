/** Exact group operations with complete line-intersection evidence. */
import {demand, type ExecutionContext} from './execution';
import type {CurveConstant} from './algebraic-curve-coordinates';
import {evaluateEllipticPolynomial, type EllipticCurveModel} from './elliptic-curve-model';
import {assertEllipticArithmeticModel, ellipticArithmeticNativeConstant as ellipticNativeConstant, type EllipticArithmeticModel} from './elliptic-arithmetic-model';

export type EllipticPoint<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>> = Readonly<{model: M & EllipticArithmeticModel<E>}> & (
  Readonly<{kind: 'infinity'}> | Readonly<{kind: 'affine'; x: CurveConstant; y: CurveConstant}>);
const points = new WeakSet<object>();
export function assertEllipticPoint<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, point: EllipticPoint<E, M>): void {
  assertEllipticArithmeticModel(ctx, model);
  demand(point !== null && typeof point === 'object' && points.has(point) && point.model === model, 'domain-mismatch', 'owned elliptic point');
  if (point.kind === 'affine') {model.curve.coordinates.constantOwner.assert(ctx, point.x); model.curve.coordinates.constantOwner.assert(ctx, point.y);}
}
export function ellipticInfinity<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>): EllipticPoint<E, M> {
  assertEllipticArithmeticModel(ctx, model); ctx.allocate(2); const point = Object.freeze({model, kind: 'infinity' as const}); points.add(point); return point;
}
export function ellipticPoint<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, x: CurveConstant, y: CurveConstant): EllipticPoint<E, M> {
  assertEllipticArithmeticModel(ctx, model); const c = model.curve.coordinates.constantOwner; c.assert(ctx, x); c.assert(ctx, y);
  demand(c.equal(ctx, c.multiply(ctx, y, y), evaluateEllipticPolynomial(ctx, model.polynomial, x)), 'invalid-input', 'elliptic point equation');
  ctx.allocate(4); const point = Object.freeze({model, kind: 'affine' as const, x, y}); points.add(point); return point;
}
export function equalEllipticPoints<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, a: EllipticPoint<E, M>, b: EllipticPoint<E, M>): boolean {
  assertEllipticPoint(ctx, model, a); assertEllipticPoint(ctx, model, b); const c = model.curve.coordinates.constantOwner;
  return a.kind === b.kind && (a.kind === 'infinity' || b.kind === 'affine' && c.equal(ctx, a.x, b.x) && c.equal(ctx, a.y, b.y));
}
export function negateEllipticPoint<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, point: EllipticPoint<E, M>): EllipticPoint<E, M> {
  assertEllipticPoint(ctx, model, point); return point.kind === 'infinity' ? point : ellipticPoint(ctx, model, point.x, model.curve.coordinates.constantOwner.negate(ctx, point.y));
}
export interface EllipticAddition<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>> {
  readonly left: EllipticPoint<E, M>;
  readonly right: EllipticPoint<E, M>;
  readonly sum: EllipticPoint<E, M>;
  readonly kind: 'left-identity' | 'right-identity' | 'vertical' | 'chord' | 'tangent';
  readonly slope: CurveConstant | null;
  readonly intercept: CurveConstant | null;
  readonly line: E | null;
  readonly vertical: E | null;
}
function vertical<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, point: EllipticPoint<E, M>): E {
  demand(point.kind === 'affine', 'invalid-input', 'finite vertical line');
  return model.curve.owner.subtract(ctx, model.x, ellipticNativeConstant(ctx, model, point.x));
}
export function verifyEllipticAddition<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, left: EllipticPoint<E, M>, right: EllipticPoint<E, M>, proof: EllipticAddition<E, M>): void {
  assertEllipticPoint(ctx, model, left); assertEllipticPoint(ctx, model, right); assertEllipticPoint(ctx, model, proof.sum);
  demand(equalEllipticPoints(ctx, model, left, proof.left) && equalEllipticPoints(ctx, model, right, proof.right), 'verification-failed', 'elliptic addition exact operands');
  const c = model.curve.coordinates.constantOwner, owner = model.curve.owner, r = model.polynomial.ring;
  if (left.kind === 'infinity' || right.kind === 'infinity') {
    demand(proof.kind === (left.kind === 'infinity' ? 'left-identity' : 'right-identity') && proof.slope === null && proof.intercept === null
      && proof.line === null && proof.vertical === null && equalEllipticPoints(ctx, model, proof.sum, left.kind === 'infinity' ? right : left), 'verification-failed', 'elliptic identity branch'); return;
  }
  const sameX = c.equal(ctx, left.x, right.x), inverseY = c.equal(ctx, left.y, c.negate(ctx, right.y));
  if (sameX && inverseY) {
    demand(proof.kind === 'vertical' && proof.sum.kind === 'infinity' && proof.slope === null && proof.intercept === null && proof.vertical === null
      && proof.line !== null && owner.equal(ctx, proof.line, vertical(ctx, model, left)) && !owner.isZero(ctx, proof.line), 'verification-failed', 'elliptic inverse/two-torsion branch'); return;
  }
  demand(proof.sum.kind === 'affine' && proof.slope !== null && proof.intercept !== null && proof.line !== null && proof.vertical !== null
    && proof.kind === (sameX ? 'tangent' : 'chord'), 'verification-failed', 'complete elliptic line branch');
  const slope = proof.slope, intercept = proof.intercept; c.assert(ctx, slope); c.assert(ctx, intercept);
  if (sameX) {
    demand(c.equal(ctx, left.y, right.y) && !c.isZero(ctx, left.y)
      && c.equal(ctx, c.multiply(ctx, slope, c.multiply(ctx, c.fromInteger(ctx, 2n), left.y)), evaluateEllipticPolynomial(ctx, r.derivative(ctx, model.polynomial), left.x)), 'verification-failed', 'elliptic tangent slope');
  } else demand(c.equal(ctx, c.multiply(ctx, slope, c.subtract(ctx, right.x, left.x)), c.subtract(ctx, right.y, left.y)), 'verification-failed', 'elliptic chord slope');
  demand(c.equal(ctx, intercept, c.subtract(ctx, left.y, c.multiply(ctx, slope, left.x))), 'verification-failed', 'elliptic line intercept');
  const x = c.subtract(ctx, c.subtract(ctx, c.subtract(ctx, c.multiply(ctx, slope, slope), model.polynomial.coefficients[2] ?? c.fromInteger(ctx, 0n)), left.x), right.x);
  const y = c.subtract(ctx, c.multiply(ctx, slope, c.subtract(ctx, left.x, x)), left.y);
  demand(c.equal(ctx, x, proof.sum.x) && c.equal(ctx, y, proof.sum.y)
    && c.equal(ctx, c.multiply(ctx, y, y), evaluateEllipticPolynomial(ctx, model.polynomial, x)), 'verification-failed', 'elliptic sum/curve equation');
  const line = r.make(ctx, [intercept, slope]), linear = (a: CurveConstant) => r.make(ctx, [c.negate(ctx, a), c.fromInteger(ctx, 1n)]);
  demand(r.equal(ctx, r.subtract(ctx, model.polynomial, r.multiply(ctx, line, line)), r.multiply(ctx, r.multiply(ctx, linear(left.x), linear(right.x)), linear(x))), 'verification-failed', 'complete cubic intersection/multiplicity identity');
  const nativeLine = owner.subtract(ctx, owner.subtract(ctx, model.y, owner.multiply(ctx, ellipticNativeConstant(ctx, model, slope), model.x)), ellipticNativeConstant(ctx, model, intercept));
  demand(owner.equal(ctx, nativeLine, proof.line) && owner.equal(ctx, vertical(ctx, model, proof.sum), proof.vertical)
    && !owner.isZero(ctx, proof.line) && !owner.isZero(ctx, proof.vertical), 'verification-failed', 'native Miller line/unit factors');
}
export function addEllipticPoints<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, left: EllipticPoint<E, M>, right: EllipticPoint<E, M>): EllipticAddition<E, M> {
  assertEllipticPoint(ctx, model, left); assertEllipticPoint(ctx, model, right);
  const c = model.curve.coordinates.constantOwner, owner = model.curve.owner; let proof: EllipticAddition<E, M>;
  const empty = {slope: null, intercept: null, line: null, vertical: null};
  if (left.kind === 'infinity') proof = Object.freeze({left, right, sum: right, kind: 'left-identity' as const, ...empty});
  else if (right.kind === 'infinity') proof = Object.freeze({left, right, sum: left, kind: 'right-identity' as const, ...empty});
  else if (c.equal(ctx, left.x, right.x) && c.equal(ctx, left.y, c.negate(ctx, right.y))) proof = Object.freeze({left, right, sum: ellipticInfinity(ctx, model), kind: 'vertical' as const, ...empty, line: vertical(ctx, model, left)});
  else {
    const tangent = c.equal(ctx, left.x, right.x), slope = tangent
      ? c.exactDivide(ctx, evaluateEllipticPolynomial(ctx, model.polynomial.ring.derivative(ctx, model.polynomial), left.x), c.multiply(ctx, c.fromInteger(ctx, 2n), left.y))
      : c.exactDivide(ctx, c.subtract(ctx, right.y, left.y), c.subtract(ctx, right.x, left.x));
    const intercept = c.subtract(ctx, left.y, c.multiply(ctx, slope, left.x));
    const x = c.subtract(ctx, c.subtract(ctx, c.subtract(ctx, c.multiply(ctx, slope, slope), model.polynomial.coefficients[2] ?? c.fromInteger(ctx, 0n)), left.x), right.x);
    const y = c.subtract(ctx, c.multiply(ctx, slope, c.subtract(ctx, left.x, x)), left.y), sum = ellipticPoint(ctx, model, x, y);
    const line = owner.subtract(ctx, owner.subtract(ctx, model.y, owner.multiply(ctx, ellipticNativeConstant(ctx, model, slope), model.x)), ellipticNativeConstant(ctx, model, intercept));
    proof = Object.freeze({left, right, sum, kind: tangent ? 'tangent' as const : 'chord' as const, slope, intercept, line, vertical: vertical(ctx, model, sum)});
  }
  ctx.allocate(8); verifyEllipticAddition(ctx, model, left, right, proof); return proof;
}
export interface EllipticMultiple<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>> {
  readonly input: EllipticPoint<E, M>;
  readonly coefficient: bigint;
  readonly base: EllipticPoint<E, M>;
  readonly adjustment: EllipticAddition<E, M> | null;
  readonly steps: readonly Readonly<{double: EllipticAddition<E, M>; add: EllipticAddition<E, M> | null}>[];
  readonly point: EllipticPoint<E, M>;
}
function digits(ctx: ExecutionContext, coefficient: bigint): readonly boolean[] {
  ctx.integer(coefficient); let n = coefficient < 0n ? -coefficient : coefficient; const bits: boolean[] = [];
  while (n) {ctx.allocate(1); bits.push(ctx.remainder(n, 2n) !== 0n); n = ctx.quotient(n, 2n);} return bits.reverse();
}
export function verifyEllipticMultiple<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, input: EllipticPoint<E, M>, coefficient: bigint, proof: EllipticMultiple<E, M>): void {
  assertEllipticPoint(ctx, model, input); ctx.integer(coefficient);
  demand(proof.coefficient === coefficient && equalEllipticPoints(ctx, model, input, proof.input), 'verification-failed', 'elliptic multiplication request');
  const base = coefficient < 0n ? negateEllipticPoint(ctx, model, input) : input;
  demand(equalEllipticPoints(ctx, model, proof.base, base), 'verification-failed', 'signed elliptic base');
  if (coefficient < 0n && input.kind !== 'infinity') {
    demand(proof.adjustment !== null, 'verification-failed', 'negative Miller adjustment'); verifyEllipticAddition(ctx, model, input, base, proof.adjustment);
    demand(proof.adjustment.kind === 'vertical' && proof.adjustment.sum.kind === 'infinity', 'verification-failed', 'negative vertical divisor');
  } else demand(proof.adjustment === null, 'verification-failed', 'unexpected negative adjustment');
  const bits = input.kind === 'infinity' ? [] : digits(ctx, coefficient); demand(proof.steps.length === bits.length, 'verification-failed', 'complete binary branch coverage');
  let previous = ellipticInfinity(ctx, model);
  for (let i = 0; i < bits.length; i++) {
    const step = proof.steps[i]; verifyEllipticAddition(ctx, model, previous, previous, step.double); previous = step.double.sum;
    if (bits[i]) {demand(step.add !== null, 'verification-failed', 'missing elliptic add bit'); verifyEllipticAddition(ctx, model, previous, base, step.add); previous = step.add.sum;}
    else demand(step.add === null, 'verification-failed', 'extra elliptic add bit');
  }
  demand(equalEllipticPoints(ctx, model, previous, proof.point), 'verification-failed', 'elliptic multiple reconstruction');
}
export function multiplyEllipticPoint<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, input: EllipticPoint<E, M>, coefficient: bigint): EllipticMultiple<E, M> {
  assertEllipticPoint(ctx, model, input); ctx.integer(coefficient);
  const base = coefficient < 0n ? negateEllipticPoint(ctx, model, input) : input;
  const adjustment = coefficient < 0n && input.kind !== 'infinity' ? addEllipticPoints(ctx, model, input, base) : null;
  const steps: {double: EllipticAddition<E, M>; add: EllipticAddition<E, M> | null}[] = []; let point = ellipticInfinity(ctx, model);
  for (const bit of input.kind === 'infinity' ? [] : digits(ctx, coefficient)) {
    const double = addEllipticPoints(ctx, model, point, point); point = double.sum;
    const add = bit ? addEllipticPoints(ctx, model, point, base) : null; if (add) point = add.sum;
    ctx.allocate(4); steps.push(Object.freeze({double, add}));
  }
  ctx.allocate(7); const proof = Object.freeze({input, coefficient, base, adjustment, steps: Object.freeze(steps), point}); verifyEllipticMultiple(ctx, model, input, coefficient, proof); return proof;
}
