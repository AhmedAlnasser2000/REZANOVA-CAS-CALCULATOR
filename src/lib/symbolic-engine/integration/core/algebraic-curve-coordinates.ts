import { demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import type { Rational } from './rational';
import { PolynomialRing, type Polynomial } from './polynomial';
import { RationalFunctionField, type RationalFunction } from './rational-function';
import type { DifferentialBounds } from './differential-field';
import type { AlgebraicElement, AlgebraicField } from './algebraic-field';
import { algebraicCoordinates, type AlgebraicCoordinates, type FunctionScalar } from './algebraic-presentation';
import { verifyAlgebraicConstantFieldWithin, type AlgebraicConstantField } from './algebraic-constant-field';
import { transposeExactMatrix, invertExactMatrix, verifyExactMatrixInverse, type MatrixInverse } from './algebraic-matrix';

export type CurveConstant = AlgebraicElement<Rational>;
export type CurveScalar = RationalFunction<CurveConstant>;

/** An auxiliary C(x) presentation. Full rank over Q(x), together with the
 * certified constants, proves both conversions and the actual relative degree.
 * The native field and its generator order remain untouched. */
export interface AlgebraicCurveArithmetic<E> {
  readonly owner: ExactField<E>;
  readonly constantOwner: AlgebraicField<Rational>;
  readonly scalar: RationalFunctionField<CurveConstant>;
  readonly basis: readonly E[];
  readonly relation: Polynomial<CurveScalar>;
  readonly relationRing: PolynomialRing<CurveScalar>;
  scalarNative(ctx: ExecutionContext, value: CurveScalar): E;
  coordinates(ctx: ExecutionContext, value: E): readonly CurveScalar[];
  native(ctx: ExecutionContext, values: readonly CurveScalar[]): E;
}
export interface AlgebraicCurveCoordinates<E> extends AlgebraicCurveArithmetic<E> {
  readonly constants: AlgebraicConstantField<E>;
  readonly rational: AlgebraicCoordinates<E>;
  readonly expanded: readonly E[];
  readonly inverse: MatrixInverse<FunctionScalar>;
}

function scalarRational(ctx: ExecutionContext, target: RationalFunctionField<CurveConstant>, source: FunctionScalar): CurveScalar {
  source.field.assert(ctx, source);
  const r = target.ring, c = r.domain;
  const convert = (p: Polynomial<Rational>) => r.make(ctx, p.coefficients.map(q => c.exactDivide(ctx, c.fromInteger(ctx, q.numerator), c.fromInteger(ctx, q.denominator))));
  return target.make(ctx, convert(source.numerator), convert(source.denominator));
}

function constantNative<E>(ctx: ExecutionContext, r: AlgebraicCoordinates<E>, constants: AlgebraicConstantField<E>, value: CurveConstant): E {
  constants.numberField.assert(ctx, value); const f = r.owner, qx = r.base;
  let result = f.fromInteger(ctx, 0n);
  for (let j = 0; j < value.representative.coefficients.length; j++) {
    ctx.allocate(r.basis.length);
    const vector = Array<FunctionScalar>(r.basis.length).fill(qx.fromInteger(ctx, 0n));
    vector[0] = qx.fromCoefficient(ctx, value.representative.coefficients[j]);
    result = f.add(ctx, result, f.multiply(ctx, r.native(ctx, vector), constants.powers[j]));
  }
  return result;
}

function maps<E>(r: AlgebraicCoordinates<E>, constants: AlgebraicConstantField<E>, scalar: RationalFunctionField<CurveConstant>,
  basis: readonly E[], inverse: MatrixInverse<FunctionScalar>) {
  const f = r.owner, c = constants.numberField, d = constants.powers.length, qx = r.base;
  const scalarNative = (ctx: ExecutionContext, value: CurveScalar): E => {
    scalar.assert(ctx, value); ctx.allocate(r.basis.length);
    const vector = Array<FunctionScalar>(r.basis.length).fill(qx.fromInteger(ctx, 0n));
    vector[0] = qx.make(ctx, qx.ring.make(ctx, [Q.fromInteger(ctx, 0n), Q.fromInteger(ctx, 1n)]), qx.ring.one(ctx));
    const x = r.native(ctx, vector);
    const evaluate = (p: Polynomial<CurveConstant>) => {
      let out = f.fromInteger(ctx, 0n);
      for (let i = p.coefficients.length - 1; i >= 0; i--) out = f.add(ctx, f.multiply(ctx, out, x), constantNative(ctx, r, constants, p.coefficients[i]));
      return out;
    };
    return f.exactDivide(ctx, evaluate(value.numerator), evaluate(value.denominator));
  };
  const native = (ctx: ExecutionContext, values: readonly CurveScalar[]): E => {
    demand(values.length === basis.length, 'invalid-input', 'curve coordinate coverage');
    let result = f.fromInteger(ctx, 0n);
    for (let i = 0; i < basis.length; i++) result = f.add(ctx, result, f.multiply(ctx, scalarNative(ctx, values[i]), basis[i]));
    return result;
  };
  const coordinates = (ctx: ExecutionContext, value: E): readonly CurveScalar[] => {
    f.assert(ctx, value); const vector = r.coordinates(ctx, value); ctx.allocate(vector.length + basis.length);
    const expanded = inverse.inverse.map(row => {
      let out = qx.fromInteger(ctx, 0n);
      for (let j = 0; j < vector.length; j++) out = qx.add(ctx, out, qx.multiply(ctx, row[j], vector[j]));
      return out;
    });
    let power = c.fromInteger(ctx, 1n); const powers: CurveConstant[] = [];
    for (let j = 0; j < d; j++) { powers.push(power); power = c.multiply(ctx, power, c.generator(ctx)); }
    const result = Object.freeze(basis.map((_, i) => {
      let out = scalar.fromInteger(ctx, 0n);
      for (let j = 0; j < d; j++) out = scalar.add(ctx, out, scalar.multiply(ctx,
        scalar.fromCoefficient(ctx, powers[j]), scalarRational(ctx, scalar, expanded[i * d + j])));
      return out;
    }));
    demand(f.equal(ctx, value, native(ctx, result)), 'verification-failed', 'curve inverse coordinate reconstruction');
    return result;
  };
  return {scalarNative, coordinates, native};
}

export interface AlgebraicCurveCoordinateEvidence<E> {
  readonly constants: AlgebraicConstantField<E>;
  readonly basis: readonly E[];
  readonly expanded: readonly E[];
  readonly inverse: MatrixInverse<FunctionScalar>;
  readonly relation: Polynomial<CurveScalar>;
}

function expandedBasis<E>(ctx: ExecutionContext, owner: ExactField<E>, constants: AlgebraicConstantField<E>, basis: readonly E[]) {
  ctx.allocate(basis.length * constants.powers.length);
  return Object.freeze(basis.flatMap(b => constants.powers.map(p => owner.multiply(ctx, b, p))));
}

/** Reconstruction-only helper, also used by replay. No presentation search or
 * linear solver is invoked here. The defining relation follows from the full
 * native basis, so irreducibility is proved over the actual constant field. */
export function verifyAlgebraicCurveCoordinatesWithin<E>(ctx: ExecutionContext, owner: ExactField<E>,
  proof: AlgebraicCurveCoordinateEvidence<E>, scalar: RationalFunctionField<CurveConstant>, relationRing: PolynomialRing<CurveScalar>,
  bounds: DifferentialBounds): AlgebraicCurveCoordinates<E> {
  verifyAlgebraicConstantFieldWithin(ctx, owner, proof.constants, bounds);
  const constants = proof.constants, r = algebraicCoordinates(ctx, owner, bounds, constants.presentation.auxiliary.parent as RationalFunctionField<Rational>);
  const c = constants.numberField, d = constants.powers.length, n = r.basis.length / d;
  demand(Number.isSafeInteger(n) && n > 0 && proof.basis.length === n && proof.expanded.length === r.basis.length,
    'verification-failed', 'curve degree over complete constants');
  demand(scalar.ring.domain === c && relationRing.domain === scalar, 'domain-mismatch', 'curve scalar ownership');
  const expanded = expandedBasis(ctx, owner, constants, proof.basis);
  for (let i = 0; i < expanded.length; i++) demand(owner.equal(ctx, expanded[i], proof.expanded[i]), 'verification-failed', 'curve expanded basis coverage');
  const matrix = transposeExactMatrix(ctx, expanded.map(v => r.coordinates(ctx, v)), r.basis.length);
  verifyExactMatrixInverse(ctx, r.base, matrix, proof.inverse);
  const m = maps(r, constants, scalar, proof.basis, proof.inverse), theta = constants.presentation.primitive;
  let power = owner.fromInteger(ctx, 1n);
  for (const b of proof.basis) { demand(owner.equal(ctx, power, b), 'verification-failed', 'curve primitive basis'); power = owner.multiply(ctx, power, theta); }
  relationRing.assert(ctx, proof.relation);
  demand(relationRing.degree(ctx, proof.relation) === n && scalar.equal(ctx, relationRing.leading(ctx, proof.relation), scalar.fromInteger(ctx, 1n)),
    'verification-failed', 'curve monic defining relation');
  let residual = power;
  for (let i = 0; i < n; i++) residual = owner.add(ctx, residual, owner.multiply(ctx, m.scalarNative(ctx, proof.relation.coefficients[i] ?? scalar.fromInteger(ctx, 0n)), proof.basis[i]));
  demand(owner.isZero(ctx, residual), 'verification-failed', 'curve exact defining relation');
  // Complete rank n*d gives spanning over C(x), not merely generator agreement.
  for (const b of r.basis) demand(owner.equal(ctx, b, m.native(ctx, m.coordinates(ctx, b))), 'verification-failed', 'curve native basis coverage');
  return Object.freeze({owner, constants, rational: r, constantOwner: c, scalar, basis: proof.basis, expanded: proof.expanded,
    inverse: proof.inverse, relation: proof.relation, relationRing, ...m});
}

export function constructAlgebraicCurveCoordinatesWithin<E>(ctx: ExecutionContext, owner: ExactField<E>,
  constants: AlgebraicConstantField<E>, bounds: DifferentialBounds): AlgebraicCurveCoordinates<E> {
  verifyAlgebraicConstantFieldWithin(ctx, owner, constants, bounds);
  const r = algebraicCoordinates(ctx, owner, bounds, constants.presentation.auxiliary.parent as RationalFunctionField<Rational>);
  const n = r.basis.length / constants.powers.length;
  demand(Number.isSafeInteger(n) && n > 0, 'verification-failed', 'curve constant-degree quotient');
  ctx.allocate(n); const basis: E[] = []; let power = owner.fromInteger(ctx, 1n);
  for (let i = 0; i < n; i++) { basis.push(power); power = owner.multiply(ctx, power, constants.presentation.primitive); }
  const frozen = Object.freeze(basis), expanded = expandedBasis(ctx, owner, constants, frozen);
  const matrix = transposeExactMatrix(ctx, expanded.map(v => r.coordinates(ctx, v)), r.basis.length), inverse = invertExactMatrix(ctx, r.base, matrix);
  demand(inverse !== null, 'verification-failed', 'curve full basis over actual constants');
  const scalar = new RationalFunctionField(new PolynomialRing(constants.numberField, r.base.ring.variable));
  const relationRing = new PolynomialRing(scalar, 'theta'), m = maps(r, constants, scalar, frozen, inverse);
  const relation = relationRing.make(ctx, [...m.coordinates(ctx, power).map(v => scalar.negate(ctx, v)), scalar.fromInteger(ctx, 1n)]);
  return verifyAlgebraicCurveCoordinatesWithin(ctx, owner, {constants, basis: frozen, expanded, inverse, relation}, scalar, relationRing, bounds);
}

/** Exact x=1/u substitution over the certified number field. */
export function reciprocalCurveScalar(ctx: ExecutionContext, target: RationalFunctionField<CurveConstant>, value: CurveScalar): CurveScalar {
  value.field.assert(ctx, value); demand(target.ring.domain === value.field.ring.domain, 'domain-mismatch', 'curve reciprocal constants');
  if (value.field.isZero(ctx, value)) return target.fromInteger(ctx, 0n);
  const r = target.ring, nd = value.numerator.coefficients.length - 1, dd = value.denominator.coefficients.length - 1;
  ctx.allocate(nd + dd + 2);
  const shift = (p: Polynomial<CurveConstant>, k: number) => {
    if (!k) return p; ctx.degree(r.degree(ctx, p) + k); ctx.allocate(p.coefficients.length + k);
    return r.make(ctx, [...Array<CurveConstant>(k).fill(r.domain.fromInteger(ctx, 0n)), ...p.coefficients]);
  };
  return target.make(ctx, shift(r.make(ctx, [...value.numerator.coefficients].reverse()), Math.max(0, dd - nd)),
    shift(r.make(ctx, [...value.denominator.coefficients].reverse()), Math.max(0, nd - dd)));
}
