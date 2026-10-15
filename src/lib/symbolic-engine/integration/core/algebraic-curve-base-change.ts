import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import { PolynomialRing, type Polynomial } from './polynomial';
import { RationalFunctionField } from './rational-function';
import type { DifferentialBounds } from './differential-field';
import { constructAlgebraicExtensionWithin, type AlgebraicField, type AlgebraicElement } from './algebraic-field';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';
import { AlgebraicEmbedding, assertAlgebraicEmbedding } from './algebraic-embedding';
import { algebraicCoordinates, type FunctionScalar } from './algebraic-presentation';
import { verifyAlgebraicCurveWithin, constructCurveOrderFromLatticeWithin, verifyCurveOrderTablesWithin, reconstructConstantBaseChangedCurveWithin,
  type AlgebraicCurveView, type AlgebraicCurveOrder } from './algebraic-curve';
import { constructCurveLattice, verifyCurveLattice } from './algebraic-curve-lattice';
import { type AlgebraicCurveArithmetic, type CurveConstant, type CurveScalar } from './algebraic-curve-coordinates';

export type CurveConstantLift = AlgebraicElement<FunctionScalar>;
export type ConstantBaseChangeValue = AlgebraicElement<CurveConstantLift>;
const coordinateOwners = new WeakSet<object>();
export interface AlgebraicConstantBaseChange<E> {
  readonly source: AlgebraicCurveView<E>;
  readonly constants: AlgebraicField<Rational>;
  readonly embedding: AlgebraicEmbedding<CurveConstant, CurveConstant>;
  readonly lift: AlgebraicField<FunctionScalar>;
  readonly field: AlgebraicField<CurveConstantLift>;
  readonly coordinates: AlgebraicCurveArithmetic<ConstantBaseChangeValue>;
  readonly originalImages: readonly ConstantBaseChangeValue[];
  readonly basisImages: readonly ConstantBaseChangeValue[];
  readonly finite: AlgebraicCurveOrder;
  readonly infinity: AlgebraicCurveOrder;
}
function transport(ctx: ExecutionContext, target: RationalFunctionField<CurveConstant>, embedding: AlgebraicEmbedding<CurveConstant, CurveConstant>, value: CurveScalar): CurveScalar {
  value.field.assert(ctx, value); demand(value.field.ring.domain === embedding.source && target.ring.domain === embedding.target, 'domain-mismatch', 'constant base-change scalar diagram');
  const convert = (p: Polynomial<CurveConstant>) => target.ring.make(ctx, p.coefficients.map(c => embedding.map(ctx, c)));
  return target.make(ctx, convert(value.numerator), convert(value.denominator));
}
function maps(ctx: ExecutionContext, constants: AlgebraicField<Rational>, lift: AlgebraicField<FunctionScalar>, field: AlgebraicField<CurveConstantLift>,
  scalar: RationalFunctionField<CurveConstant>): AlgebraicCurveArithmetic<ConstantBaseChangeValue> {
  const base = lift.parent as RationalFunctionField<Rational>, n = field.ring.degree(ctx, field.modulus), d = constants.ring.degree(ctx, constants.modulus);
  const toLift = (c: ExecutionContext, value: CurveScalar): CurveConstantLift => {
    scalar.assert(c, value);
    const transpose = (p: Polynomial<CurveConstant>): CurveConstantLift => {
      scalar.ring.assert(c, p); const size = d * p.coefficients.length;
      demand(Number.isSafeInteger(size), 'invalid-input', 'constant scalar transport dimensions'); c.allocate(size + d);
      const coefficients = Array.from({length: d}, (_, i) => base.make(c, base.ring.make(c,
        p.coefficients.map(coefficient => {constants.assert(c, coefficient); return coefficient.representative.coefficients[i] ?? Q.fromInteger(c, 0n);})), base.ring.one(c)));
      return lift.make(c, lift.ring.make(c, coefficients));
    };
    return lift.exactDivide(c, transpose(value.numerator), transpose(value.denominator));
  };
  const fromLift = (c: ExecutionContext, value: CurveConstantLift): CurveScalar => {
    lift.assert(c, value); let out = scalar.fromInteger(c, 0n), power = constants.fromInteger(c, 1n);
    for (let i = 0; i < d; i++) {
      const coefficient = value.representative.coefficients[i] ?? base.fromInteger(c, 0n);
      const convert = (p: Polynomial<Rational>) => scalar.ring.make(c, p.coefficients.map(q => constants.embed(c, q)));
      const rational = scalar.make(c, convert(coefficient.numerator), convert(coefficient.denominator));
      out = scalar.add(c, out, scalar.multiply(c, scalar.fromCoefficient(c, power), rational)); power = constants.multiply(c, power, constants.generator(c));
    }
    demand(lift.equal(c, value, toLift(c, out)), 'verification-failed', 'constant scalar inverse reconstruction'); return out;
  };
  ctx.allocate(n); const basis: ConstantBaseChangeValue[] = []; let power = field.fromInteger(ctx, 1n);
  for (let i = 0; i < n; i++) { basis.push(power); power = field.multiply(ctx, power, field.generator(ctx)); }
  const coordinates = (c: ExecutionContext, value: ConstantBaseChangeValue) => {
    field.assert(c, value); c.allocate(n); return Object.freeze(Array.from({length: n}, (_, i) => fromLift(c, value.representative.coefficients[i] ?? lift.fromInteger(c, 0n))));
  };
  const native = (c: ExecutionContext, values: readonly CurveScalar[]) => {
    demand(values.length === n, 'invalid-input', 'base-change native coordinate coverage'); return field.make(c, field.ring.make(c, values.map(v => toLift(c, v))));
  };
  const scalarNative = (c: ExecutionContext, value: CurveScalar) => field.embed(c, toLift(c, value));
  const relationRing = new PolynomialRing(scalar, field.ring.variable), relation = relationRing.make(ctx, field.modulus.coefficients.map(v => fromLift(ctx, v)));
  const result = Object.freeze({owner: field, constantOwner: constants, scalar, basis: Object.freeze(basis), relationRing, relation, scalarNative, coordinates, native});
  coordinateOwners.add(result); return result;
}
function originalValue<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, value: E, target: AlgebraicCurveArithmetic<ConstantBaseChangeValue>,
  embedding: AlgebraicEmbedding<CurveConstant, CurveConstant>): ConstantBaseChangeValue {
  return target.native(ctx, source.coordinates.coordinates(ctx, value).map(v => transport(ctx, target.scalar, embedding, v)));
}
function changedOrder<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, embedding: AlgebraicEmbedding<CurveConstant, CurveConstant>,
  coordinates: AlgebraicCurveArithmetic<ConstantBaseChangeValue>, infinity: boolean): AlgebraicCurveOrder {
  const original = infinity ? source.infinity : source.finite;
  const scalar = infinity ? new RationalFunctionField(new PolynomialRing(coordinates.constantOwner, original.lattice.scalar.ring.variable)) : coordinates.scalar;
  const input = original.lattice.basis.map(row => row.map(v => transport(ctx, scalar, embedding, v)));
  return constructCurveOrderFromLatticeWithin(ctx, coordinates, infinity, constructCurveLattice(ctx, scalar, input, source.coordinates.basis.length));
}
export function baseChangeAlgebraicCurveWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, constants: AlgebraicField<Rational>,
  embedding: AlgebraicEmbedding<CurveConstant, CurveConstant>, bounds: DifferentialBounds): AlgebraicConstantBaseChange<E> {
  verifyAlgebraicCurveWithin(ctx, source.owner, source, bounds); verifyAlgebraicChainWithin(ctx, constants, bounds);
  assertAlgebraicEmbedding(ctx, embedding);
  demand(constants.parent === Q && embedding.source === source.coordinates.constantOwner && embedding.target === constants, 'domain-mismatch', 'explicit constant extension/embedding');
  const scalarBase = new RationalFunctionField(new PolynomialRing(Q, source.coordinates.scalar.ring.variable)), constantRing = new PolynomialRing(scalarBase, 'gamma');
  const lift = constructAlgebraicExtensionWithin(ctx, constantRing, constantRing.make(ctx, constants.modulus.coefficients.map(q => scalarBase.fromCoefficient(ctx, q))), bounds);
  const scalar = new RationalFunctionField(new PolynomialRing(constants, source.coordinates.scalar.ring.variable));
  // A temporary degree-one owner provides the same checked C'(x) arithmetic
  // conversion used by the final owner; it grants no geometry authority.
  const temporaryRing = new PolynomialRing(lift, 'theta'), temporary = constructAlgebraicExtensionWithin(ctx, temporaryRing,
    temporaryRing.make(ctx, [lift.fromInteger(ctx, 0n), lift.fromInteger(ctx, 1n)]), bounds);
  const conversion = maps(ctx, constants, lift, temporary, scalar);
  const relation = source.coordinates.relation.coefficients.map(v => {
    const native = conversion.scalarNative(ctx, transport(ctx, scalar, embedding, v));
    return native.representative.coefficients[0] ?? lift.fromInteger(ctx, 0n);
  });
  const field = constructAlgebraicExtensionWithin(ctx, temporaryRing, temporaryRing.make(ctx, relation), bounds), coordinates = maps(ctx, constants, lift, field, scalar);
  const originals = algebraicCoordinates(ctx, source.owner, bounds), originalImages = Object.freeze(originals.generators.map(v => originalValue(ctx, source, v, coordinates, embedding)));
  const basisImages = Object.freeze(source.coordinates.basis.map(v => originalValue(ctx, source, v, coordinates, embedding)));
  const finite = changedOrder(ctx, source, embedding, coordinates, false), infinity = changedOrder(ctx, source, embedding, coordinates, true);
  const proof = Object.freeze({source, constants, embedding, lift, field, coordinates, originalImages, basisImages, finite, infinity});
  verifyAlgebraicConstantBaseChangeWithin(ctx, source, constants, embedding, proof, bounds); return proof;
}
export function verifyAlgebraicConstantBaseChangeWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, constants: AlgebraicField<Rational>,
  embedding: AlgebraicEmbedding<CurveConstant, CurveConstant>, proof: AlgebraicConstantBaseChange<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, source.owner, source, bounds); verifyAlgebraicChainWithin(ctx, constants, bounds);
  assertAlgebraicEmbedding(ctx, embedding);
  demand(proof.source === source && proof.constants === constants && proof.embedding === embedding && constants.parent === Q
    && embedding.source === source.coordinates.constantOwner && embedding.target === constants, 'domain-mismatch', 'base-change complete expected constructions');
  const image = embedding.map(ctx, source.coordinates.constantOwner.generator(ctx));
  const checked = AlgebraicEmbedding.extension(ctx, source.coordinates.constantOwner, constants, AlgebraicEmbedding.rationals(ctx, constants, bounds), image, bounds);
  for (const b of source.coordinates.constantOwner.modulus.coefficients) Q.assert(ctx, b);
  const c = source.coordinates.constantOwner; let power = c.fromInteger(ctx, 1n);
  for (let i = 0; i < c.ring.degree(ctx, c.modulus); i++) { demand(constants.equal(ctx, checked.map(ctx, power), embedding.map(ctx, power)), 'verification-failed', 'constant embedding full basis'); power = c.multiply(ctx, power, c.generator(ctx)); }
  verifyAlgebraicChainWithin(ctx, proof.lift, bounds); verifyAlgebraicChainWithin(ctx, proof.field, bounds);
  const base = proof.lift.parent; demand(base instanceof RationalFunctionField && base.ring.domain === Q && proof.field.parent === proof.lift,
    'domain-mismatch', 'base-change auxiliary coefficient owners');
  const qx = base as RationalFunctionField<Rational>, expected = proof.lift.ring.make(ctx, constants.modulus.coefficients.map(q => qx.fromCoefficient(ctx, q)));
  demand(proof.lift.ring.equal(ctx, expected, proof.lift.modulus), 'verification-failed', 'constant lift exact defining relation');
  const target = proof.coordinates;
  demand(coordinateOwners.has(target) && target.owner === proof.field && target.constantOwner === constants && target.scalar.ring.domain === constants
    && target.basis.length === source.coordinates.basis.length && proof.field.ring.degree(ctx, proof.field.modulus) === target.basis.length,
    'verification-failed', 'base-change complete relative degree');
  const expectedRelation = source.coordinates.relation.coefficients.map(v => transport(ctx, target.scalar, embedding, v));
  demand(target.relationRing.degree(ctx, target.relation) === target.basis.length && expectedRelation.length === target.relation.coefficients.length
    && expectedRelation.every((v, i) => target.scalar.equal(ctx, v, target.relation.coefficients[i])), 'verification-failed', 'base-change full defining correspondence');
  const derived = maps(ctx, constants, proof.lift, proof.field, target.scalar);
  for (let i = 0; i < target.basis.length; i++) {
    demand(proof.field.equal(ctx, target.basis[i], derived.basis[i]), 'verification-failed', 'base-change power basis correspondence');
    for (const value of [target.basis[i], target.scalarNative(ctx, target.scalar.fromCoefficient(ctx, constants.generator(ctx)))]) {
      const vector = derived.coordinates(ctx, value), other = target.coordinates(ctx, value);
      demand(vector.length === other.length && vector.every((v, j) => target.scalar.equal(ctx, v, other[j])) && proof.field.equal(ctx, value, target.native(ctx, vector)),
        'verification-failed', 'base-change independent inverse conversion');
    }
  }
  const originals = algebraicCoordinates(ctx, source.owner, bounds);
  demand(originals.generators.length === proof.originalImages.length && proof.basisImages.length === target.basis.length, 'verification-failed', 'base-change supplied generator/basis coverage');
  for (let i = 0; i < originals.generators.length; i++) demand(proof.field.equal(ctx, proof.originalImages[i], originalValue(ctx, source, originals.generators[i], derived, embedding)), 'verification-failed', 'original generator base-change image');
  for (let i = 0; i < target.basis.length; i++) demand(proof.field.equal(ctx, proof.basisImages[i], originalValue(ctx, source, source.coordinates.basis[i], derived, embedding)), 'verification-failed', 'original basis base-change image');
  for (const infinity of [false, true]) {
    const original = infinity ? source.infinity : source.finite, order = infinity ? proof.infinity : proof.finite;
    if (!infinity) demand(order.lattice.scalar === target.scalar, 'domain-mismatch', 'base-change finite chart');
    const input = original.lattice.basis.map(row => row.map(v => transport(ctx, order.lattice.scalar, embedding, v)));
    verifyCurveLattice(ctx, order.lattice.scalar, input, target.basis.length, order.lattice); verifyCurveOrderTablesWithin(ctx, derived, infinity, order);
  }
  // Full constants and characteristic zero imply K/C is geometrically integral.
  // Tensoring with the explicit finite C'/C stays a field, with exact constants
  // C'. The original normal orders are smooth over perfect C; their C' base
  // changes remain normal. Complete transported bases prove the maximal orders
  // without rerunning integral-basis or constant-field search.
}
/** Replay derives fresh native maps from checked owners, never stored callbacks. */
export function reconstructAlgebraicConstantBaseChangeWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, constants: AlgebraicField<Rational>,
  embedding: AlgebraicEmbedding<CurveConstant, CurveConstant>, lift: AlgebraicField<FunctionScalar>, field: AlgebraicField<CurveConstantLift>,
  scalar: RationalFunctionField<CurveConstant>, originalImages: readonly ConstantBaseChangeValue[], basisImages: readonly ConstantBaseChangeValue[],
  finite: AlgebraicCurveOrder, infinity: AlgebraicCurveOrder, bounds: DifferentialBounds): AlgebraicConstantBaseChange<E> {
  const coordinates = maps(ctx, constants, lift, field, scalar), proof = Object.freeze({source, constants, embedding, lift, field, coordinates,
    originalImages, basisImages, finite, infinity});
  verifyAlgebraicConstantBaseChangeWithin(ctx, source, constants, embedding, proof, bounds); return proof;
}
export function baseChangeAlgebraicCurve<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, constants: AlgebraicField<Rational>,
  embedding: AlgebraicEmbedding<CurveConstant, CurveConstant>, bounds: DifferentialBounds) {
  return ctx.operation(() => {
    const proof = baseChangeAlgebraicCurveWithin(ctx, source, constants, embedding, bounds), curve = reconstructConstantBaseChangedCurveWithin(ctx, proof, bounds);
    return Object.freeze({proof, curve});
  });
}
export function verifyAlgebraicConstantBaseChange<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, constants: AlgebraicField<Rational>,
  embedding: AlgebraicEmbedding<CurveConstant, CurveConstant>, proof: AlgebraicConstantBaseChange<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyAlgebraicConstantBaseChangeWithin(ctx, source, constants, embedding, proof, bounds));
}
