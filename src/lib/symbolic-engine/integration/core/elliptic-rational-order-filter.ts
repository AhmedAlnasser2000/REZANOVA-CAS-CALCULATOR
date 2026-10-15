/** Smooth finite-prime images eliminate impossible rational torsion orders.
 * These records have no characteristic-zero field capabilities. */
import {demand, type ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import type {Rational} from './rational';
import {FactorPrimeField, modularBezout, verifyModularBezout, type FactorModularBezout} from './factorization-modular';
import {rationalGcdPrimeFields, checkedRationalGcdPrimeField} from './rational-gcd-evidence';
import type {EllipticArithmeticModel} from './elliptic-arithmetic-model';
import {assertEllipticPoint, type EllipticPoint} from './elliptic-group';
import type {EllipticCurveModel} from './elliptic-curve-model';
import {rationalEllipticOrders} from './elliptic-rational-orders';

type Point = Readonly<{kind: 'infinity'}>|Readonly<{kind: 'affine'; x: bigint; y: bigint}>;
interface Addition {readonly left: Point; readonly right: Point; readonly sum: Point; readonly slope: bigint|null}
interface Multiple {readonly coefficient: bigint; readonly point: Point; readonly steps: readonly Readonly<{double: Addition; add: Addition|null}>[]}
export interface RationalEllipticOrderFilter {
  readonly prime: bigint; readonly polynomial: readonly bigint[]; readonly squareFree: FactorModularBezout; readonly point: Point; readonly tests: readonly Multiple[];
}
const infinity: Point = Object.freeze({kind: 'infinity'});
function equal(a: Point, b: Point): boolean {return a.kind === b.kind && (a.kind === 'infinity' || b.kind === 'affine' && a.x === b.x && a.y === b.y);}
function checkPoint(ctx: ExecutionContext, field: FactorPrimeField, polynomial: readonly bigint[], p: Point): void {
  demand(p !== null && typeof p === 'object', 'verification-failed', 'finite elliptic point record');
  demand(p.kind === 'affine' || p.kind === 'infinity', 'verification-failed', 'finite elliptic point kind'); if (p.kind === 'infinity') return;
  for (const q of [p.x, p.y]) {ctx.integer(q); demand(q >= 0n && q < field.modulus, 'verification-failed', 'canonical finite point');}
  let value = 0n; for (let i = 3; i >= 0; i--) value = field.plus(ctx, field.times(ctx, value, p.x), polynomial[i]);
  demand(field.times(ctx, p.y, p.y) === value, 'verification-failed', 'finite elliptic curve equation');
}
function add(ctx: ExecutionContext, field: FactorPrimeField, h: readonly bigint[], a: Point, b: Point, retained?: Addition): Addition {
  if (retained !== undefined) {demand(retained !== null && typeof retained === 'object', 'verification-failed', 'finite elliptic addition record'); checkPoint(ctx, field, h, retained.sum);}
  checkPoint(ctx, field, h, a); checkPoint(ctx, field, h, b); let sum: Point, slope: bigint|null = null;
  if (a.kind === 'infinity') sum = b;
  else if (b.kind === 'infinity') sum = a;
  else if (a.x === b.x && field.plus(ctx, a.y, b.y) === 0n) sum = infinity;
  else {
    const denominator = a.x === b.x ? field.times(ctx, 2n, a.y) : field.plus(ctx, b.x, -a.x),
      numerator = a.x === b.x ? field.plus(ctx, field.plus(ctx, field.times(ctx, 3n, field.times(ctx, a.x, a.x)), field.times(ctx, 2n, field.times(ctx, h[2], a.x))), h[1]) : field.plus(ctx, b.y, -a.y);
    demand(denominator !== 0n, 'verification-failed', 'finite elliptic slope denominator');
    slope = retained === undefined ? field.times(ctx, numerator, field.inverse(ctx, denominator)) : retained.slope;
    demand(slope !== null && slope >= 0n && slope < field.modulus && field.times(ctx, slope, denominator) === numerator, 'verification-failed', 'finite elliptic slope identity');
    const x = field.plus(ctx, field.plus(ctx, field.plus(ctx, field.times(ctx, slope, slope), -h[2]), -a.x), -b.x), y = field.plus(ctx, field.times(ctx, slope, field.plus(ctx, a.x, -x)), -a.y);
    ctx.allocate(3); sum = Object.freeze({kind: 'affine', x, y});
  }
  checkPoint(ctx, field, h, sum);
  if (retained !== undefined) {demand(equal(a, retained.left) && equal(b, retained.right) && equal(sum, retained.sum) && slope === retained.slope, 'verification-failed', 'finite elliptic complete addition branch'); return retained;}
  ctx.allocate(4); return Object.freeze({left: a, right: b, sum, slope});
}
function multiple(ctx: ExecutionContext, field: FactorPrimeField, h: readonly bigint[], p: Point, n: bigint, retained?: Multiple): Multiple {
  ctx.integer(n); demand(n > 0n, 'verification-failed', 'positive rational-order filter'); let k = n, point = infinity; const bits: boolean[] = [];
  while (k) {ctx.allocate(1); bits.push(ctx.remainder(k, 2n) !== 0n); k = ctx.quotient(k, 2n);} bits.reverse();
  if (retained !== undefined) {
    demand(retained !== null && typeof retained === 'object' && retained.coefficient === n && Array.isArray(retained.steps) && retained.steps.length === bits.length, 'verification-failed', 'finite order complete binary coverage');
    checkPoint(ctx, field, h, retained.point);
  }
  const steps: {double: Addition; add: Addition|null}[] = [];
  for (let i = 0; i < bits.length; i++) {
    const prior = retained?.steps[i]; if (retained !== undefined) demand(prior !== undefined && prior !== null && typeof prior === 'object' && prior.double !== undefined, 'verification-failed', 'finite order retained double');
    const double = add(ctx, field, h, point, point, prior?.double); point = double.sum;
    let plus: Addition|null = null;
    if (bits[i]) {if (prior !== undefined) demand(prior.add !== null && prior.add !== undefined, 'verification-failed', 'missing finite order add'); plus = add(ctx, field, h, point, p, prior?.add ?? undefined); point = plus.sum;}
    else if (prior !== undefined) demand(prior.add === null, 'verification-failed', 'extra finite order add');
    if (retained === undefined) {ctx.allocate(3); steps.push(Object.freeze({double, add: plus}));}
  }
  if (retained !== undefined) {demand(equal(point, retained.point), 'verification-failed', 'finite order point reconstruction'); return retained;}
  ctx.allocate(3); return Object.freeze({coefficient: n, point, steps: Object.freeze(steps)});
}
function rational<E, M extends EllipticArithmeticModel<E>>(ctx: ExecutionContext, model: M, value: import('./algebraic-curve-coordinates').CurveConstant): Rational {
  const c = model.curve.coordinates.constantOwner; demand(c.parent === Q && c.modulus.coefficients.length === 2, 'domain-mismatch', 'rational elliptic constants'); c.assert(ctx, value);
  const q = value.representative.coefficients[0] ?? Q.fromInteger(ctx, 0n); Q.assert(ctx, q); demand(c.equal(ctx, c.embed(ctx, q), value), 'verification-failed', 'complete rational constant descent'); return q;
}
function image<E, M extends EllipticArithmeticModel<E>>(ctx: ExecutionContext, model: M, p: EllipticPoint<E, M>, field: FactorPrimeField) {
  const convert = (q: Rational) => field.residue(ctx, q.denominator) === 0n ? null : field.times(ctx, field.residue(ctx, q.numerator), field.inverse(ctx, field.residue(ctx, q.denominator)));
  ctx.allocate(4); const h: bigint[] = []; for (const a of model.polynomial.coefficients) {const value = convert(rational(ctx, model, a)); if (value === null) return null; h.push(value);}
  demand(h.length === 4 && h[3] === 1n, 'verification-failed', 'monic Weierstrass cubic image'); let point: Point = infinity;
  if (p.kind === 'affine') {const x = convert(rational(ctx, model, p.x)), y = convert(rational(ctx, model, p.y)); if (x === null || y === null) return null; ctx.allocate(3); point = Object.freeze({kind: 'affine', x, y});}
  return {h: Object.freeze(h), point};
}
export function produceRationalEllipticFiltersWithin<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, p: EllipticPoint<E, M>): readonly RationalEllipticOrderFilter[] {
  assertEllipticPoint(ctx, model, p); const proofs: RationalEllipticOrderFilter[] = [];
  for (const field of rationalGcdPrimeFields(ctx)) {
    if (field.modulus <= 3n) continue; const data = image(ctx, model, p, field); if (data === null) continue;
    const h = field.make(ctx, data.h), squareFree = modularBezout(ctx, field, h, field.derivative(ctx, h)); if (squareFree.gcd.length !== 1 || squareFree.gcd[0] !== 1n) continue;
    ctx.allocate(rationalEllipticOrders.length + 5); const tests = Object.freeze(rationalEllipticOrders.map(n => multiple(ctx, field, data.h, data.point, n)));
    proofs.push(Object.freeze({prime: field.modulus, polynomial: data.h, squareFree, point: data.point, tests})); if (proofs.length === 2) return Object.freeze(proofs);
  }
  demand(false, 'verification-failed', 'complete good elliptic prime search');
}
export function verifyRationalEllipticFiltersWithin<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(ctx: ExecutionContext, model: M & EllipticArithmeticModel<E>, p: EllipticPoint<E, M>, proofs: readonly RationalEllipticOrderFilter[]): readonly bigint[] {
  assertEllipticPoint(ctx, model, p); demand(Array.isArray(proofs) && proofs.length === 2 && proofs.every(p => p !== null && typeof p === 'object') && proofs[0].prime !== proofs[1].prime, 'verification-failed', 'two distinct smooth elliptic reductions');
  ctx.allocate(rationalEllipticOrders.length); let orders = [...rationalEllipticOrders];
  for (const proof of proofs) {
    const field = checkedRationalGcdPrimeField(ctx, proof.prime); demand(proof.prime > 3n, 'verification-failed', 'elliptic tame characteristic'); const data = image(ctx, model, p, field);
    demand(data !== null && data.h.length === proof.polynomial.length && data.h.every((v, i) => v === proof.polynomial[i]) && equal(data.point, proof.point), 'verification-failed', 'complete elliptic good reduction correspondence');
    const h = field.bind(ctx, proof.polynomial); verifyModularBezout(ctx, field, h, field.derivative(ctx, h), proof.squareFree); demand(proof.squareFree.gcd.length === 1 && proof.squareFree.gcd[0] === 1n, 'verification-failed', 'smooth proper elliptic reduction');
    demand(Array.isArray(proof.tests) && proof.tests.length === rationalEllipticOrders.length, 'verification-failed', 'complete rational-order specialization coverage');
    for (let i = 0; i < proof.tests.length; i++) {
      demand(proof.tests[i] !== undefined, 'verification-failed', 'finite order retained test');
      multiple(ctx, field, data.h, data.point, rationalEllipticOrders[i], proof.tests[i]);
    }
    orders = orders.filter(n => proof.tests[rationalEllipticOrders.indexOf(n)].point.kind === 'infinity'); ctx.allocate(orders.length);
  }
  return Object.freeze(orders);
}
