import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { polynomialDivide } from './polynomial-division';
import { verifyAlgebraicCurveWithin, curveOrderNative, curveOrderCoordinates, type AlgebraicCurveView } from './algebraic-curve';
import { assertAlgebraicPlace, type AlgebraicPlace } from './algebraic-place';
import { reciprocalCurveScalar, type CurveConstant, type CurveScalar } from './algebraic-curve-coordinates';
import type { CurvePlaceResidue } from './algebraic-residue-algebra';
import { curveIdealPowerBasis, type CurveFractionalIdeal } from './algebraic-fractional-ideal';
import { powerCurveIdeal, verifyCurveIdealPower, type CurveIdealPower } from './algebraic-ideal-power';
import { algebraicValuationWithin, verifyAlgebraicValuationWithin, curvePolynomialOrder, verifyCurvePolynomialOrder,
  type AlgebraicValuation, type CurvePolynomialOrder } from './algebraic-valuation';
import { curveDenominators, verifyCurveDenominators, type CurveDenominators } from './algebraic-curve-lattice';
import { transposeExactMatrix, invertExactMatrix, verifyExactMatrixInverse, type MatrixInverse } from './algebraic-matrix';
import { solveLinearSystem, verifyLinearSolution, type LinearSystem, type LinearSolution } from './linear-system';

export interface AlgebraicLocalParameter<E> { readonly index: number; readonly value: E; readonly valuation: AlgebraicValuation<E> }
function parameterValue<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, index: number): E {
  const basis = curveIdealPowerBasis(ctx, curve, place.ideal);
  demand(Number.isSafeInteger(index) && index >= 0 && index < basis.length, 'verification-failed', 'local parameter basis index');
  return curveOrderNative(ctx, curve.coordinates, place.order, basis[index]);
}
export function algebraicLocalParameterWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>): AlgebraicLocalParameter<E> {
  assertAlgebraicPlace(ctx, curve, place);
  for (let index = 0; index < place.ideal.lattice.dimension; index++) {
    const value = parameterValue(ctx, curve, place, index), valuation = algebraicValuationWithin(ctx, curve, place, value);
    if (valuation.value === 1n) return Object.freeze({index, value, valuation});
  }
  // P is a maximal ideal of a Dedekind order. Any full polynomial basis of P
  // generates its localization, so at least one basis member has valuation one.
  demand(false, 'verification-failed', 'complete maximal ideal lacks a uniformizer');
}
export function verifyAlgebraicLocalParameterWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, proof: AlgebraicLocalParameter<E>): void {
  assertAlgebraicPlace(ctx, curve, place);
  demand(curve.owner.equal(ctx, proof.value, parameterValue(ctx, curve, place, proof.index)), 'verification-failed', 'local parameter native conversion');
  verifyAlgebraicValuationWithin(ctx, curve, place, proof.value, proof.valuation);
  demand(proof.valuation.value === 1n, 'verification-failed', 'local parameter exact order one');
}
interface LocalSlot { readonly row: number; readonly power: number }
function quotientSlots<E>(ctx: ExecutionContext, ideal: CurveFractionalIdeal<E>): readonly LocalSlot[] {
  const r = ideal.order.lattice.scalar.ring, n = ideal.lattice.dimension;
  const degree = ideal.lattice.basis.map((row, i) => {
    demand(row.every(v => r.degree(ctx, v.denominator) === 0), 'verification-failed', 'local integral quotient lattice');
    return r.degree(ctx, row[i].numerator);
  });
  let size = 0; for (const d of degree) { demand(d >= 0 && Number.isSafeInteger(size + d), 'verification-failed', 'local quotient dimension'); size += d; }
  ctx.allocate(size); const slots: LocalSlot[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < degree[i]; j++) { ctx.tick(); slots.push(Object.freeze({row: i, power: j})); }
  return Object.freeze(slots);
}
function quotientCoordinates<E>(ctx: ExecutionContext, ideal: CurveFractionalIdeal<E>, vector: readonly CurveScalar[], slots: readonly LocalSlot[]): readonly CurveConstant[] {
  const r = ideal.order.lattice.scalar.ring, n = ideal.lattice.dimension;
  demand(vector.length === n, 'invalid-input', 'local quotient vector'); ctx.allocate(n + slots.length);
  const remainder = vector.map(v => { demand(r.degree(ctx, v.denominator) === 0, 'verification-failed', 'local quotient polynomial input'); return v.numerator; });
  for (let i = 0; i < n; i++) {
    const row = ideal.lattice.basis[i], quotient = polynomialDivide(ctx, r, remainder[i], row[i].numerator).quotient;
    for (let j = i; j < n; j++) remainder[j] = r.subtract(ctx, remainder[j], r.multiply(ctx, quotient, row[j].numerator));
  }
  return Object.freeze(slots.map(({row, power}) => remainder[row].coefficients[power] ?? r.domain.fromInteger(ctx, 0n)));
}
function precisionSize(ctx: ExecutionContext, value: bigint): number {
  ctx.integer(value); demand(value >= 0n, 'invalid-input', 'nonnegative local precision');
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) ctx.exhaust('local-precision-index'); return Number(value);
}
function residueLifts<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>): readonly E[] {
  const f = place.order.lattice.scalar, c = curve.coordinates, n = c.basis.length, owner = curve.owner;
  const orderBasis = place.order.lattice.basis.map(row => curveOrderNative(ctx, c, place.order, row));
  let theta = owner.fromInteger(ctx, 0n), seed = 1n;
  for (let j = 0; j < n; j++) { theta = owner.add(ctx, theta, owner.multiply(ctx, owner.fromInteger(ctx, seed), orderBasis[j])); seed = ctx.multiply(seed, place.algebra.seed); }
  const variable = f.make(ctx, f.ring.make(ctx, [f.ring.domain.fromInteger(ctx, 0n), f.ring.domain.fromInteger(ctx, 1n)]), f.ring.one(ctx));
  const rho = c.scalarNative(ctx, place.order.infinity ? reciprocalCurveScalar(ctx, c.scalar, variable) : variable);
  const a = place.algebra.base.ring.degree(ctx, place.algebra.base.modulus), b = place.residue.ring.degree(ctx, place.residue.modulus);
  ctx.allocate(a * b); const values: E[] = []; let sigmaPower = owner.fromInteger(ctx, 1n);
  for (let j = 0; j < b; j++) {
    let rhoPower = owner.fromInteger(ctx, 1n);
    for (let i = 0; i < a; i++) { values.push(owner.multiply(ctx, sigmaPower, rhoPower)); rhoPower = owner.multiply(ctx, rhoPower, rho); }
    sigmaPower = owner.multiply(ctx, sigmaPower, theta);
  }
  return Object.freeze(values);
}
function digitLifts<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, parameter: E, precision: number): readonly E[] {
  const residue = residueLifts(ctx, curve, place), owner = curve.owner;
  demand(Number.isSafeInteger(residue.length * precision), 'invalid-input', 'local digit dimensions'); ctx.allocate(residue.length * precision);
  const result: E[] = []; let power = owner.fromInteger(ctx, 1n);
  for (let j = 0; j < precision; j++) { for (const r of residue) result.push(owner.multiply(ctx, power, r)); power = owner.multiply(ctx, power, parameter); }
  return Object.freeze(result);
}
export interface AlgebraicLocalExpansion<E> {
  readonly place: AlgebraicPlace<E>;
  readonly input: E;
  readonly precision: bigint;
  readonly regular: AlgebraicValuation<E> | null;
  readonly parameter: AlgebraicLocalParameter<E>;
  readonly power: CurveIdealPower<E>;
  readonly slots: readonly LocalSlot[];
  readonly lifts: readonly E[];
  readonly digitInverse: MatrixInverse<CurveConstant>;
  readonly denominators: CurveDenominators;
  readonly denominatorOrder: CurvePolynomialOrder;
  readonly extended: CurveIdealPower<E>;
  readonly extendedSlots: readonly LocalSlot[];
  readonly elimination: LinearSolution<CurveConstant>;
  readonly coefficients: readonly CurveConstant[];
  readonly digits: readonly CurvePlaceResidue[];
  readonly lift: E;
  readonly error: AlgebraicValuation<E> | null;
}
function request<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, denominators: CurveDenominators,
  lifts: readonly E[], extended: CurveFractionalIdeal<E>, slots: readonly LocalSlot[]): LinearSystem<CurveConstant> {
  const f = place.order.lattice.scalar, scale = f.make(ctx, denominators.common, f.ring.one(ctx));
  const columns = lifts.map(v => quotientCoordinates(ctx, extended, curveOrderCoordinates(ctx, curve.coordinates, place.order, v).map(c => f.multiply(ctx, scale, c)), slots));
  const target = curveOrderCoordinates(ctx, curve.coordinates, place.order, input).map(c => f.multiply(ctx, scale, c));
  return Object.freeze({rows: slots.length, columns: lifts.length, matrix: transposeExactMatrix(ctx, columns, slots.length), rhs: quotientCoordinates(ctx, extended, target, slots)});
}
function digits(ctx: ExecutionContext, place: AlgebraicPlace<unknown>, coefficients: readonly CurveConstant[], precision: number) {
  const residue = place.residue, base = place.algebra.base, c = base.parent, a = base.ring.degree(ctx, base.modulus), b = residue.ring.degree(ctx, residue.modulus);
  ctx.allocate(precision * (a * b + b)); return Object.freeze(Array.from({length: precision}, (_, j) => residue.make(ctx, residue.ring.make(ctx,
    Array.from({length: b}, (_, k) => base.make(ctx, base.ring.make(ctx, Array.from({length: a}, (_, i) => coefficients[j * a * b + k * a + i] ?? c.fromInteger(ctx, 0n)))))))));
}
export function expandAlgebraicPlaceWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, precision: bigint): AlgebraicLocalExpansion<E> {
  assertAlgebraicPlace(ctx, curve, place); curve.owner.assert(ctx, input); const m = precisionSize(ctx, precision), f = place.order.lattice.scalar;
  const regular = curve.owner.isZero(ctx, input) ? null : algebraicValuationWithin(ctx, curve, place, input);
  demand(regular === null || regular.value >= 0n, 'invalid-input', 'local expansion requires a regular function');
  const parameter = algebraicLocalParameterWithin(ctx, curve, place), power = powerCurveIdeal(ctx, curve, place.ideal, precision), slots = quotientSlots(ctx, power.result);
  const lifts = digitLifts(ctx, curve, place, parameter.value, m), columns = lifts.map(v => quotientCoordinates(ctx, power.result, curveOrderCoordinates(ctx, curve.coordinates, place.order, v), slots));
  const digitInverse = invertExactMatrix(ctx, curve.coordinates.constantOwner, transposeExactMatrix(ctx, columns, slots.length));
  demand(digitInverse !== null && BigInt(slots.length) === ctx.multiply(precision, place.degree), 'verification-failed', 'complete local digit basis');
  const inputCoordinates = curveOrderCoordinates(ctx, curve.coordinates, place.order, input), denominators = curveDenominators(ctx, f.ring, inputCoordinates.map(v => v.denominator));
  const denominatorOrder = curvePolynomialOrder(ctx, denominators.common, place.prime), r = ctx.multiply(place.ramification, BigInt(denominatorOrder.quotients.length));
  const extended = powerCurveIdeal(ctx, curve, place.ideal, ctx.add(precision, r)), extendedSlots = quotientSlots(ctx, extended.result);
  const elimination = solveLinearSystem(ctx, curve.coordinates.constantOwner, request(ctx, curve, place, input, denominators, lifts, extended.result, extendedSlots));
  demand(elimination.kind === 'consistent' && elimination.nullspace.length === 0, 'verification-failed', 'complete regular local lift');
  const coefficients = elimination.particular, output = digits(ctx, place, coefficients, m); let lift = curve.owner.fromInteger(ctx, 0n);
  for (let i = 0; i < lifts.length; i++) lift = curve.owner.add(ctx, lift, curve.owner.multiply(ctx, curve.coordinates.scalarNative(ctx, curve.coordinates.scalar.fromCoefficient(ctx, coefficients[i])), lifts[i]));
  const difference = curve.owner.subtract(ctx, input, lift), error = curve.owner.isZero(ctx, difference) ? null : algebraicValuationWithin(ctx, curve, place, difference);
  const proof = Object.freeze({place, input, precision, regular, parameter, power, slots, lifts, digitInverse, denominators, denominatorOrder,
    extended, extendedSlots, elimination, coefficients, digits: output, lift, error}); verifyAlgebraicLocalExpansionWithin(ctx, curve, place, input, precision, proof); return proof;
}
export function verifyAlgebraicLocalExpansionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E,
  precision: bigint, proof: AlgebraicLocalExpansion<E>): void {
  assertAlgebraicPlace(ctx, curve, place); const m = precisionSize(ctx, precision), f = place.order.lattice.scalar, c = curve.coordinates.constantOwner;
  demand(proof.place === place && proof.precision === precision && curve.owner.equal(ctx, proof.input, input), 'verification-failed', 'local expansion exact request');
  if (proof.regular === null) demand(curve.owner.isZero(ctx, input), 'verification-failed', 'local zero regularity');
  else { verifyAlgebraicValuationWithin(ctx, curve, place, input, proof.regular); demand(proof.regular.value >= 0n, 'verification-failed', 'local regularity'); }
  verifyAlgebraicLocalParameterWithin(ctx, curve, place, proof.parameter); verifyCurveIdealPower(ctx, curve, place.ideal, precision, proof.power);
  const slots = quotientSlots(ctx, proof.power.result), lifts = digitLifts(ctx, curve, place, proof.parameter.value, m);
  demand(BigInt(slots.length) === ctx.multiply(precision, place.degree) && slots.length === proof.slots.length && slots.every((s, i) => s.row === proof.slots[i].row && s.power === proof.slots[i].power)
    && lifts.length === proof.lifts.length && lifts.every((v, i) => curve.owner.equal(ctx, v, proof.lifts[i])), 'verification-failed', 'local full filtered basis coverage');
  const columns = lifts.map(v => quotientCoordinates(ctx, proof.power.result, curveOrderCoordinates(ctx, curve.coordinates, place.order, v), slots));
  verifyExactMatrixInverse(ctx, c, transposeExactMatrix(ctx, columns, slots.length), proof.digitInverse);
  const coordinates = curveOrderCoordinates(ctx, curve.coordinates, place.order, input);
  verifyCurveDenominators(ctx, f.ring, coordinates.map(v => v.denominator), proof.denominators);
  verifyCurvePolynomialOrder(ctx, proof.denominators.common, place.prime, proof.denominatorOrder);
  const r = ctx.multiply(place.ramification, BigInt(proof.denominatorOrder.quotients.length));
  verifyCurveIdealPower(ctx, curve, place.ideal, ctx.add(precision, r), proof.extended); const extendedSlots = quotientSlots(ctx, proof.extended.result);
  demand(proof.extendedSlots.length === extendedSlots.length && extendedSlots.every((s, i) => s.row === proof.extendedSlots[i].row && s.power === proof.extendedSlots[i].power), 'verification-failed', 'local denominator-clearing coverage');
  verifyLinearSolution(ctx, c, request(ctx, curve, place, input, proof.denominators, lifts, proof.extended.result, extendedSlots), proof.elimination);
  demand(proof.elimination.kind === 'consistent' && proof.elimination.nullspace.length === 0 && proof.coefficients.length === lifts.length
    && proof.coefficients.every((v, i) => c.equal(ctx, v, proof.elimination.kind === 'consistent' ? proof.elimination.particular[i] : v)), 'verification-failed', 'local unique coefficients');
  const output = digits(ctx, place, proof.coefficients, m); demand(proof.digits.length === m && output.every((v, i) => place.residue.equal(ctx, v, proof.digits[i])), 'verification-failed', 'local residue digit mapping');
  let lift = curve.owner.fromInteger(ctx, 0n);
  for (let i = 0; i < lifts.length; i++) lift = curve.owner.add(ctx, lift, curve.owner.multiply(ctx, curve.coordinates.scalarNative(ctx, curve.coordinates.scalar.fromCoefficient(ctx, proof.coefficients[i])), lifts[i]));
  demand(curve.owner.equal(ctx, lift, proof.lift), 'verification-failed', 'local exact lift reconstruction'); const difference = curve.owner.subtract(ctx, input, lift);
  if (proof.error === null) demand(curve.owner.isZero(ctx, difference), 'verification-failed', 'local exact zero error');
  else { verifyAlgebraicValuationWithin(ctx, curve, place, difference, proof.error); demand(proof.error.value >= precision, 'verification-failed', 'local remainder precision'); }
}
export function expandAlgebraicPlace<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, precision: bigint, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return expandAlgebraicPlaceWithin(ctx, curve, place, input, precision); });
}
export function verifyAlgebraicLocalExpansion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, input: E, precision: bigint,
  proof: AlgebraicLocalExpansion<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicLocalExpansionWithin(ctx, curve, place, input, precision, proof); });
}
export function algebraicLocalParameter<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return algebraicLocalParameterWithin(ctx, curve, place); });
}
export function verifyAlgebraicLocalParameter<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, proof: AlgebraicLocalParameter<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicLocalParameterWithin(ctx, curve, place, proof); });
}
