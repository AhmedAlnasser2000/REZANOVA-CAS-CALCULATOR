import { demand, type ExecutionContext } from './execution';
import { rationalField as Q, type ExactField } from './field';
import type { Rational } from './rational';
import { PolynomialRing } from './polynomial';
import { RationalFunctionField, type RationalFunction } from './rational-function';
import { factorCoefficientDomain, type FactorCoefficientDomain } from './factorization-domain';
import type { DifferentialBounds } from './differential-field';
import { constructAlgebraicExtensionWithin, isAlgebraicField, UnsupportedAlgebraicDomain, type AlgebraicElement, type AlgebraicField } from './algebraic-field';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';
import { transposeExactMatrix, invertExactMatrix, verifyExactMatrixInverse, type MatrixInverse } from './algebraic-matrix';

export type FunctionScalar = RationalFunction<Rational>;
export interface AlgebraicCoordinates<E> {
  readonly owner: ExactField<E>;
  readonly base: RationalFunctionField<Rational>;
  readonly basis: readonly E[];
  readonly generators: readonly E[];
  coordinates(ctx: ExecutionContext, value: E): readonly FunctionScalar[];
  native(ctx: ExecutionContext, coordinates: readonly FunctionScalar[]): E;
}
/** Mechanical checked power-basis conversion. A new rational owner is auxiliary;
 * native owners and generator order are never changed. */
export function algebraicCoordinates<E>(ctx: ExecutionContext, owner: ExactField<E>, bounds: DifferentialBounds,
  suppliedBase?: RationalFunctionField<Rational>): AlgebraicCoordinates<E> {
  const parent = isAlgebraicField(owner) ? algebraicCoordinates(ctx, owner.parent, bounds, suppliedBase) : null;
  let scalar: FactorCoefficientDomain<E> | null = null;
  if (!parent) { scalar = factorCoefficientDomain(ctx, owner, bounds.towerHeight);
    if (!(scalar.height === 1 && scalar.fraction !== null && scalar.child !== null)) throw new UnsupportedAlgebraicDomain('function-field presentation requires Q(x)'); }
  const base = parent?.base ?? suppliedBase ?? new RationalFunctionField(new PolynomialRing(Q, scalar!.fraction!.ring.variable));
  const d = isAlgebraicField(owner) ? owner.ring.degree(ctx, owner.modulus) : 1;
  const size = d * (parent?.basis.length ?? 1);
  demand(Number.isSafeInteger(size), 'invalid-input', 'algebraic basis dimension'); ctx.degree(size); ctx.allocate(size + (parent?.generators.length ?? 0) + 8);
  const basis: E[] = [], generators: E[] = [];
  if (isAlgebraicField(owner)) {
    const field: AlgebraicField<unknown> = owner; let power = field.fromInteger(ctx, 1n);
    for (let k = 0; k < d; k++) {
      for (const b of parent!.basis) basis.push(field.multiply(ctx, field.embed(ctx, b), power) as E);
      power = field.multiply(ctx, power, field.generator(ctx));
    }
    for (const g of parent!.generators) generators.push(field.embed(ctx, g) as E); generators.push(field.generator(ctx) as E);
  } else basis.push(owner.fromInteger(ctx, 1n));
  function coordinates(c: ExecutionContext, value: E): readonly FunctionScalar[] {
    owner.assert(c, value); c.allocate(size);
    if (!parent) {
      const parts = scalar!.fraction!.read(c, value), r = base.ring, child = scalar!.child!;
      const convert = (p: typeof parts.numerator) => r.make(c, p.coefficients.map(v => child.rational(c, v)));
      const result = base.make(c, convert(parts.numerator), convert(parts.denominator));
      const reverse = (p: typeof result.numerator) => scalar!.fraction!.ring.make(c, p.coefficients.map(q => child.fromRational(c, q)));
      demand(owner.equal(c, value, scalar!.fraction!.make(c, reverse(result.numerator), reverse(result.denominator))), 'verification-failed', 'rational coefficient forward reconstruction');
      return Object.freeze([result]);
    }
    const valueParts = (value as unknown as AlgebraicElement<unknown>).representative.coefficients, out: FunctionScalar[] = [];
    const field = owner as unknown as AlgebraicField<unknown>;
    for (let i = 0; i < d; i++) out.push(...parent.coordinates(c, valueParts[i] ?? field.parent.fromInteger(c, 0n)));
    return Object.freeze(out);
  }
  function native(c: ExecutionContext, values: readonly FunctionScalar[]): E {
    demand(values.length === size, 'invalid-input', 'algebraic coordinate coverage'); for (const v of values) base.assert(c, v);
    if (!parent) {
      const v = values[0], f = scalar!.fraction!, child = scalar!.child!;
      const convert = (p: typeof v.numerator) => f.ring.make(c, p.coefficients.map(q => child.fromRational(c, q)));
      const result = f.make(c, convert(v.numerator), convert(v.denominator)), back = f.read(c, result);
      const reverse = (p: typeof back.numerator) => base.ring.make(c, p.coefficients.map(q => child.rational(c, q)));
      demand(base.equal(c, v, base.make(c, reverse(back.numerator), reverse(back.denominator))), 'verification-failed', 'rational coefficient inverse reconstruction'); return result;
    }
    const field = owner as unknown as AlgebraicField<unknown>, n = parent.basis.length; c.allocate(d);
    return field.make(c, field.ring.make(c, Array.from({length: d}, (_, i) => parent.native(c, values.slice(i * n, (i + 1) * n))))) as E;
  }
  return Object.freeze({owner, base, basis: Object.freeze(basis), generators: Object.freeze(generators), coordinates, native});
}
export interface AlgebraicPresentation<E> {
  readonly auxiliary: AlgebraicField<FunctionScalar>;
  readonly combination: readonly bigint[];
  readonly primitive: E;
  readonly powers: readonly E[];
  readonly basis: MatrixInverse<FunctionScalar>;
  readonly generatorCoordinates: readonly (readonly FunctionScalar[])[];
}
function powerMatrix<E>(ctx: ExecutionContext, coordinates: AlgebraicCoordinates<E>, powers: readonly E[]) {
  return transposeExactMatrix(ctx, powers.map(p => coordinates.coordinates(ctx, p)), coordinates.basis.length);
}
export function primitiveCoordinates<E>(ctx: ExecutionContext, coordinates: AlgebraicCoordinates<E>,
  proof: AlgebraicPresentation<E>, value: E): readonly FunctionScalar[] {
  const f = coordinates.base, vector = coordinates.coordinates(ctx, value); ctx.allocate(vector.length);
  return Object.freeze(proof.basis.inverse.map(row => {
    let sum = f.fromInteger(ctx, 0n); for (let i = 0; i < row.length; i++) sum = f.add(ctx, sum, f.multiply(ctx, row[i], vector[i])); return sum;
  }));
}
export function presentationValue<E>(ctx: ExecutionContext, coordinates: AlgebraicCoordinates<E>, proof: AlgebraicPresentation<E>,
  value: AlgebraicElement<FunctionScalar>): E {
  proof.auxiliary.assert(ctx, value); const f = coordinates.owner, n = coordinates.basis.length;
  let out = f.fromInteger(ctx, 0n);
  for (let i = 0; i < value.representative.coefficients.length; i++) {
    const vector = Array(n).fill(coordinates.base.fromInteger(ctx, 0n)); ctx.allocate(n);
    vector[0] = value.representative.coefficients[i];
    out = f.add(ctx, out, f.multiply(ctx, coordinates.native(ctx, vector), proof.powers[i]));
  }
  return out;
}
export function algebraicPrimitivePresentationWithin<E>(ctx: ExecutionContext, coordinates: AlgebraicCoordinates<E>, bounds: DifferentialBounds): AlgebraicPresentation<E> {
  const f = coordinates.owner, n = coordinates.basis.length;
  let seed = 1n;
  for (;;) {
    ctx.integer(seed); ctx.allocate(coordinates.generators.length + n + 5);
    const combination: bigint[] = []; let coefficient = 1n, primitive = f.fromInteger(ctx, 0n);
    for (const g of coordinates.generators) {
      combination.push(coefficient); primitive = f.add(ctx, primitive, f.multiply(ctx, f.fromInteger(ctx, coefficient), g));
      coefficient *= seed; ctx.integer(coefficient);
    }
    // The rational base has the degree-one presentation with primitive zero.
    let power = f.fromInteger(ctx, 1n); const powers: E[] = [];
    for (let i = 0; i < n; i++) { powers.push(power); power = f.multiply(ctx, power, primitive); }
    const matrix = powerMatrix(ctx, coordinates, powers), basis = invertExactMatrix(ctx, coordinates.base, matrix);
    if (!basis) { seed++; continue; }
    const vector = coordinates.coordinates(ctx, power), b = coordinates.base;
    const coefficients = basis.inverse.map(row => {
      let out = b.fromInteger(ctx, 0n); for (let i = 0; i < n; i++) out = b.add(ctx, out, b.multiply(ctx, row[i], vector[i])); return b.negate(ctx, out);
    }); coefficients.push(b.fromInteger(ctx, 1n));
    const ring = new PolynomialRing(b, 'theta'), auxiliary = constructAlgebraicExtensionWithin(ctx, ring, ring.make(ctx, coefficients), bounds);
    const partial = {auxiliary, combination: Object.freeze(combination), primitive, powers: Object.freeze(powers), basis};
    const result = Object.freeze({...partial, generatorCoordinates: Object.freeze(coordinates.generators.map(g => primitiveCoordinates(ctx, coordinates, {...partial, generatorCoordinates: []}, g)))});
    verifyAlgebraicPresentationWithin(ctx, coordinates, result, bounds); return result;
  }
}
export function verifyAlgebraicPresentationWithin<E>(ctx: ExecutionContext, coordinates: AlgebraicCoordinates<E>, proof: AlgebraicPresentation<E>, bounds: DifferentialBounds): void {
  const f = coordinates.owner, n = coordinates.basis.length, a = proof.auxiliary;
  demand(a.parent === coordinates.base && a.ring.degree(ctx, a.modulus) === n && proof.combination.length === coordinates.generators.length
    && proof.powers.length === n && proof.generatorCoordinates.length === coordinates.generators.length, 'verification-failed', 'primitive presentation coverage');
  verifyAlgebraicChainWithin(ctx, a, bounds); let theta = f.fromInteger(ctx, 0n), power = f.fromInteger(ctx, 1n);
  for (const b of coordinates.basis) demand(f.equal(ctx, b, coordinates.native(ctx, coordinates.coordinates(ctx, b))), 'verification-failed', 'complete supplied power-basis reconstruction');
  for (let i = 0; i < coordinates.generators.length; i++) {
    ctx.integer(proof.combination[i]); theta = f.add(ctx, theta, f.multiply(ctx, f.fromInteger(ctx, proof.combination[i]), coordinates.generators[i]));
  }
  demand(f.equal(ctx, theta, proof.primitive), 'verification-failed', 'primitive combination');
  for (let i = 0; i < n; i++) { demand(f.equal(ctx, proof.powers[i], power), 'verification-failed', 'primitive powers'); power = f.multiply(ctx, power, theta); }
  verifyExactMatrixInverse(ctx, coordinates.base, powerMatrix(ctx, coordinates, proof.powers), proof.basis);
  // Full rank n and the exact relation prove both conversions cover the entire
  // field. Relation irreducibility is independently replayed by the auxiliary.
  let relation = power;
  for (let i = 0; i < n; i++) {
    const vector = Array(n).fill(coordinates.base.fromInteger(ctx, 0n)); ctx.allocate(n); vector[0] = a.modulus.coefficients[i];
    relation = f.add(ctx, relation, f.multiply(ctx, coordinates.native(ctx, vector), proof.powers[i]));
  }
  demand(f.isZero(ctx, relation), 'verification-failed', 'primitive relation');
  for (let i = 0; i < coordinates.generators.length; i++) {
    const value = a.make(ctx, a.ring.make(ctx, proof.generatorCoordinates[i]));
    demand(f.equal(ctx, presentationValue(ctx, coordinates, proof, value), coordinates.generators[i]), 'verification-failed', 'original generator reconstruction');
  }
}
