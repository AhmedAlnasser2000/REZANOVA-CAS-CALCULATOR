import { demand, type ExecutionContext } from './execution';
import type { ExactField } from './field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { RationalFunctionField } from './rational-function';
import type { DifferentialBounds } from './differential-field';
import type { AlgebraicConstantField } from './algebraic-constant-field';
import { presentationValue, type FunctionScalar } from './algebraic-presentation';
import { reciprocalScalar, type AlgebraicIntegralModel } from './algebraic-integral-model';
import { modelBase, type AlgebraicOrder } from './algebraic-order';
import { constructAlgebraicCurveCoordinatesWithin, verifyAlgebraicCurveCoordinatesWithin, reciprocalCurveScalar,
  type AlgebraicCurveArithmetic, type AlgebraicCurveCoordinates, type AlgebraicCurveCoordinateEvidence, type CurveConstant, type CurveScalar } from './algebraic-curve-coordinates';
import { constructCurveLattice, verifyCurveLattice, curveLatticeCoordinates, type CurveLattice } from './algebraic-curve-lattice';
import { freezeExactMatrix, equalExactMatrices, invertExactMatrix, verifyExactMatrixInverse, determinantFromInverse,
  type ExactMatrix, type MatrixInverse } from './algebraic-matrix';
import { verifyAlgebraicConstantBaseChangeWithin, type AlgebraicConstantBaseChange } from './algebraic-curve-base-change';

export interface AlgebraicCurveOrder {
  readonly infinity: boolean;
  readonly lattice: CurveLattice;
  readonly multiplication: readonly ExactMatrix<Polynomial<CurveConstant>>[];
  readonly traces: readonly Polynomial<CurveConstant>[];
  readonly gram: ExactMatrix<CurveScalar>;
  readonly traceInverse: MatrixInverse<CurveScalar>;
  readonly discriminant: Polynomial<CurveConstant>;
}

/** Authority is the immutable native chain and full constant-field evidence,
 * not the existence of a curve-shaped object or matching names. */
export interface AlgebraicCurveView<E> {
  readonly owner: ExactField<E>;
  readonly coordinates: AlgebraicCurveArithmetic<E>;
  readonly finite: AlgebraicCurveOrder;
  readonly infinity: AlgebraicCurveOrder;
  readonly authority: Readonly<{kind: 'native'; evidence: AlgebraicCurveEvidence<E>}> |
    Readonly<{kind: 'constant-base-change'; evidence: AlgebraicConstantBaseChange<unknown>}>;
}
export interface NativeAlgebraicCurveView<E> extends AlgebraicCurveView<E> {
  readonly coordinates: AlgebraicCurveCoordinates<E>;
  readonly authority: Readonly<{kind: 'native'; evidence: AlgebraicCurveEvidence<E>}>;
}
const curves = new WeakSet<object>();
function immutableCurveEvidence(ctx: ExecutionContext, value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  ctx.allocate(1); seen.add(value); demand(Object.isFrozen(value), 'invalid-input', 'mutable curve evidence');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return;
  for (const key of Reflect.ownKeys(value)) {
    const property = Object.getOwnPropertyDescriptor(value, key)!; demand('value' in property, 'invalid-input', 'curve evidence accessor');
    ctx.tick(); immutableCurveEvidence(ctx, property.value, seen);
  }
}
export function assertAlgebraicCurveOwner<E>(ctx: ExecutionContext, view: AlgebraicCurveView<E>): void {
  ctx.tick(); demand(view !== null && typeof view === 'object' && curves.has(view), 'domain-mismatch', 'certified curve owner');
}

function polynomialCoordinate(ctx: ExecutionContext, value: CurveScalar): Polynomial<CurveConstant> {
  value.field.assert(ctx, value);
  demand(value.field.ring.degree(ctx, value.denominator) === 0, 'verification-failed', 'curve order polynomial coordinate');
  return value.numerator;
}
function rationalNative<E>(ctx: ExecutionContext, c: AlgebraicCurveCoordinates<E>, value: FunctionScalar): E {
  const r = c.rational; ctx.allocate(r.basis.length);
  const vector = Array<FunctionScalar>(r.basis.length).fill(r.base.fromInteger(ctx, 0n)); vector[0] = value;
  return r.native(ctx, vector);
}
function orderSources<E>(ctx: ExecutionContext, c: AlgebraicCurveCoordinates<E>, model: AlgebraicIntegralModel, order: AlgebraicOrder,
  chart: RationalFunctionField<CurveConstant>): ExactMatrix<CurveScalar> {
  const r = c.rational, f = c.owner, n = order.basis.length, base = modelBase(model);
  const convert = (v: FunctionScalar) => model.infinity ? reciprocalScalar(ctx, r.base, v) : v;
  const scale = convert(base.make(ctx, model.denominators.common, base.ring.one(ctx)));
  const beta = f.multiply(ctx, rationalNative(ctx, c, scale), c.constants.presentation.primitive);
  ctx.allocate(n * c.basis.length);
  const rows = Array.from({length: n}, (_, j) => {
    let value = f.fromInteger(ctx, 0n), power = f.fromInteger(ctx, 1n);
    for (let i = 0; i < n; i++) {
      value = f.add(ctx, value, f.multiply(ctx, rationalNative(ctx, c, convert(order.basis[i][j])), power));
      power = f.multiply(ctx, power, beta);
    }
    const vector = c.coordinates(ctx, value);
    return vector.map(v => model.infinity ? reciprocalCurveScalar(ctx, chart, v) : v);
  });
  return freezeExactMatrix(ctx, rows);
}

export function curveOrderNative<E>(ctx: ExecutionContext, c: AlgebraicCurveArithmetic<E>, order: Pick<AlgebraicCurveOrder, 'infinity' | 'lattice'>, vector: readonly CurveScalar[]): E {
  const values = vector.map(v => order.infinity ? reciprocalCurveScalar(ctx, c.scalar, v) : v);
  return c.native(ctx, values);
}
export function curveOrderCoordinates<E>(ctx: ExecutionContext, c: AlgebraicCurveArithmetic<E>, order: Pick<AlgebraicCurveOrder, 'infinity' | 'lattice'>, value: E): readonly CurveScalar[] {
  const vector = c.coordinates(ctx, value).map(v => order.infinity ? reciprocalCurveScalar(ctx, order.lattice.scalar, v) : v);
  return curveLatticeCoordinates(ctx, order.lattice, vector);
}

function newtonTrace<E>(ctx: ExecutionContext, c: AlgebraicCurveArithmetic<E>, value: E): CurveScalar {
  const f = c.scalar, n = c.basis.length, relation = c.relation.coefficients, vector = c.coordinates(ctx, value);
  ctx.allocate(n); const sums = [f.fromInteger(ctx, BigInt(n))];
  for (let k = 1; k < n; k++) {
    let sum = f.multiply(ctx, f.fromInteger(ctx, BigInt(k)), relation[n - k] ?? f.fromInteger(ctx, 0n));
    for (let j = 1; j < k; j++) sum = f.add(ctx, sum, f.multiply(ctx, relation[n - j] ?? f.fromInteger(ctx, 0n), sums[k - j]));
    sums.push(f.negate(ctx, sum));
  }
  let result = f.fromInteger(ctx, 0n);
  for (let i = 0; i < n; i++) result = f.add(ctx, result, f.multiply(ctx, vector[i], sums[i]));
  return result;
}
function tables<E>(ctx: ExecutionContext, c: AlgebraicCurveArithmetic<E>, infinity: boolean, lattice: CurveLattice) {
  const f = lattice.scalar, r = f.ring, n = c.basis.length;
  ctx.allocate(n * n * n + n * n + n);
  const partial = {infinity, lattice};
  const native = lattice.basis.map(row => curveOrderNative(ctx, c, partial, row));
  const multiplication = Object.freeze(native.map(a => {
    const columns = native.map(b => curveOrderCoordinates(ctx, c, partial, c.owner.multiply(ctx, a, b)));
    return freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => columns.map(row => polynomialCoordinate(ctx, row[i]))));
  }));
  const traces = Object.freeze(native.map((v, j) => {
    let trace = r.zero(ctx); for (let i = 0; i < n; i++) trace = r.add(ctx, trace, multiplication[j][i][i]);
    const independent = newtonTrace(ctx, c, v), expected = infinity ? reciprocalCurveScalar(ctx, f, independent) : independent;
    demand(f.equal(ctx, f.make(ctx, trace, r.one(ctx)), expected), 'verification-failed', 'curve independent trace'); return trace;
  }));
  const gram = freezeExactMatrix(ctx, native.map((_, i) => native.map((_, j) => {
    let sum = r.zero(ctx); for (let k = 0; k < n; k++) sum = r.add(ctx, sum, r.multiply(ctx, multiplication[j][k][i], traces[k]));
    return f.make(ctx, sum, r.one(ctx));
  })));
  return {multiplication, traces, gram};
}
function constructOrder<E>(ctx: ExecutionContext, c: AlgebraicCurveCoordinates<E>, infinity: boolean): AlgebraicCurveOrder {
  const model = infinity ? c.constants.infinity : c.constants.finite, original = infinity ? c.constants.infinityClosure.final : c.constants.finiteClosure.final;
  const chart = infinity ? new RationalFunctionField(new PolynomialRing(c.constantOwner, 'u')) : c.scalar;
  const source = orderSources(ctx, c, model, original, chart), lattice = constructCurveLattice(ctx, chart, source, c.basis.length);
  return constructCurveOrderFromLatticeWithin(ctx, c, infinity, lattice);
}
export function constructCurveOrderFromLatticeWithin<E>(ctx: ExecutionContext, c: AlgebraicCurveArithmetic<E>, infinity: boolean, lattice: CurveLattice): AlgebraicCurveOrder {
  const chart = lattice.scalar, t = tables(ctx, c, infinity, lattice), traceInverse = invertExactMatrix(ctx, chart, t.gram);
  demand(traceInverse !== null, 'verification-failed', 'curve separable trace form');
  const discriminant = polynomialCoordinate(ctx, determinantFromInverse(ctx, chart, traceInverse));
  return Object.freeze({infinity, lattice, ...t, traceInverse, discriminant});
}
function verifyOrder<E>(ctx: ExecutionContext, c: AlgebraicCurveCoordinates<E>, infinity: boolean, proof: AlgebraicCurveOrder): void {
  demand(proof.infinity === infinity && proof.lattice.scalar.ring.domain === c.constantOwner, 'domain-mismatch', 'curve order chart');
  if (!infinity) demand(proof.lattice.scalar === c.scalar, 'domain-mismatch', 'curve finite scalar');
  const model = infinity ? c.constants.infinity : c.constants.finite, original = infinity ? c.constants.infinityClosure.final : c.constants.finiteClosure.final;
  const source = orderSources(ctx, c, model, original, proof.lattice.scalar);
  verifyCurveLattice(ctx, proof.lattice.scalar, source, c.basis.length, proof.lattice);
  verifyCurveOrderTablesWithin(ctx, c, infinity, proof);
  // The old complete Q[x] order equals its C[x] span: C is integral over Q,
  // and the certified maximal order contains C. Full HNF spans prove equality.
  // The identical argument applies at infinity before localization at u=0.
}
export function verifyCurveOrderTablesWithin<E>(ctx: ExecutionContext, c: AlgebraicCurveArithmetic<E>, infinity: boolean, proof: AlgebraicCurveOrder): void {
  demand(proof.infinity === infinity && proof.lattice.scalar.ring.domain === c.constantOwner, 'domain-mismatch', 'curve order constant/chart binding');
  const t = tables(ctx, c, infinity, proof.lattice), f = proof.lattice.scalar, r = f.ring, n = c.basis.length;
  demand(proof.multiplication.length === n && proof.traces.length === n, 'verification-failed', 'curve order table coverage');
  for (let j = 0; j < n; j++) demand(equalExactMatrices(ctx, r, proof.multiplication[j], t.multiplication[j]) && r.equal(ctx, proof.traces[j], t.traces[j]),
    'verification-failed', 'curve order multiplication/trace');
  demand(equalExactMatrices(ctx, f, proof.gram, t.gram), 'verification-failed', 'curve trace pairing');
  verifyExactMatrixInverse(ctx, f, t.gram, proof.traceInverse);
  demand(r.equal(ctx, proof.discriminant, polynomialCoordinate(ctx, determinantFromInverse(ctx, f, proof.traceInverse))), 'verification-failed', 'curve discriminant');
}

export interface AlgebraicCurveEvidence<E> {
  readonly coordinates: AlgebraicCurveCoordinateEvidence<E>;
  readonly finite: AlgebraicCurveOrder;
  readonly infinity: AlgebraicCurveOrder;
}
export function reconstructAlgebraicCurveWithin<E>(ctx: ExecutionContext, owner: ExactField<E>, proof: AlgebraicCurveEvidence<E>,
  scalar: RationalFunctionField<CurveConstant>, relationRing: PolynomialRing<CurveScalar>, bounds: DifferentialBounds): NativeAlgebraicCurveView<E> {
  const coordinates = verifyAlgebraicCurveCoordinatesWithin(ctx, owner, proof.coordinates, scalar, relationRing, bounds);
  verifyOrder(ctx, coordinates, false, proof.finite); verifyOrder(ctx, coordinates, true, proof.infinity);
  const coordinateEvidence = Object.freeze({constants: proof.coordinates.constants, basis: proof.coordinates.basis, expanded: proof.coordinates.expanded,
    inverse: proof.coordinates.inverse, relation: proof.coordinates.relation});
  const evidence = Object.freeze({coordinates: coordinateEvidence, finite: proof.finite, infinity: proof.infinity}); immutableCurveEvidence(ctx, evidence);
  ctx.allocate(6); const view = Object.freeze({owner, coordinates, finite: proof.finite, infinity: proof.infinity,
    authority: Object.freeze({kind: 'native' as const, evidence})}); curves.add(view); return view;
}
export function certifyAlgebraicCurve<E>(ctx: ExecutionContext, owner: ExactField<E>, constants: AlgebraicConstantField<E>, bounds: DifferentialBounds): NativeAlgebraicCurveView<E> {
  return ctx.operation(() => {
    const coordinates = constructAlgebraicCurveCoordinatesWithin(ctx, owner, constants, bounds);
    const finite = constructOrder(ctx, coordinates, false), infinity = constructOrder(ctx, coordinates, true);
    return reconstructAlgebraicCurveWithin(ctx, owner, {coordinates, finite, infinity}, coordinates.scalar, coordinates.relationRing, bounds);
  });
}
export function verifyAlgebraicCurve<E>(ctx: ExecutionContext, owner: ExactField<E>, view: AlgebraicCurveView<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyAlgebraicCurveWithin(ctx, owner, view, bounds));
}
export function verifyAlgebraicCurveWithin<E>(ctx: ExecutionContext, owner: ExactField<E>, view: AlgebraicCurveView<E>, bounds: DifferentialBounds): void {
  assertAlgebraicCurveOwner(ctx, view); demand(view.owner === owner, 'domain-mismatch', 'curve native field ownership');
  if (view.authority.kind === 'native') reconstructAlgebraicCurveWithin(ctx, owner, view.authority.evidence, view.coordinates.scalar, view.coordinates.relationRing, bounds);
  else {
    const proof = view.authority.evidence; verifyAlgebraicConstantBaseChangeWithin(ctx, proof.source, proof.constants, proof.embedding, proof, bounds);
    demand(view.owner === proof.field as unknown as ExactField<E> && view.coordinates === proof.coordinates && view.finite === proof.finite && view.infinity === proof.infinity,
      'domain-mismatch', 'base-changed curve authority mapping');
  }
}
export function reconstructConstantBaseChangedCurveWithin<E>(ctx: ExecutionContext, proof: AlgebraicConstantBaseChange<E>, bounds: DifferentialBounds) {
  verifyAlgebraicConstantBaseChangeWithin(ctx, proof.source, proof.constants, proof.embedding, proof, bounds);
  immutableCurveEvidence(ctx, proof);
  const view = Object.freeze({owner: proof.field, coordinates: proof.coordinates, finite: proof.finite, infinity: proof.infinity,
    authority: Object.freeze({kind: 'constant-base-change' as const, evidence: proof as unknown as AlgebraicConstantBaseChange<unknown>})});
  ctx.allocate(6); curves.add(view); return view;
}

/** Both sides of this map are retained; no branch or name establishes an
 * embedding. Used by divisor and local algorithms rather than reparsing values. */
export function curvePresentationValue<E>(ctx: ExecutionContext, c: AlgebraicCurveCoordinates<E>, coefficients: readonly FunctionScalar[]): E {
  const a = c.constants.presentation.auxiliary;
  return presentationValue(ctx, c.rational, c.constants.presentation, a.make(ctx, a.ring.make(ctx, coefficients)));
}
