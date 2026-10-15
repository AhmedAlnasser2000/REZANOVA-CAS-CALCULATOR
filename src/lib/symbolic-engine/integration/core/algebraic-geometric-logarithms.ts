/** Complete ordered residue-divisor composition, with certified geometric
 * principal multiples and factored logarithms. This is subsidiary evidence;
 * the integration candidate still needs final explicit-target checking. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {ExactField} from './field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicResidueRelationsWithin, type AlgebraicResidueRelations, type AlgebraicResidueRelationsData} from './algebraic-residue-relations';
import {decideAlgebraicPrincipalMultipleWithin, verifyAlgebraicPrincipalMultipleWithin, principalMultipleOrder, principalMultipleFactors, principalMultipleFactorInverse, type AlgebraicPrincipalMultiple} from './algebraic-principal-multiple-dispatch';
import {differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative} from './algebraic-derivative';
import {algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition} from './algebraic-conditions';
import {convertAlgebraicConstantValue, verifyAlgebraicConstantValueConversion, type AlgebraicConstantValueConversion} from './algebraic-constant-quotient';
import type {ConstantBaseChangeValue} from './algebraic-curve-base-change';
import type {NumberValue} from './relative-number-field';
import {constructAlgebraicPrimitiveWithin, verifyAlgebraicTraceLogTermWithin} from './algebraic-primitive';
import {constructNativeAlgebraicPrimitiveWithin, verifyNativeAlgebraicLogTermWithin, type NativeAlgebraicPrimitive, type NativeAlgebraicLogInput} from './algebraic-native-primitive';

export interface GeometricAlgebraicLogFactor {
  readonly value: unknown; readonly exponent: bigint; readonly inverse: unknown;
  readonly derivative: AlgebraicDerivative<unknown>;
}
export interface GeometricAlgebraicLogComponent {
  readonly index: number; readonly multiple: AlgebraicPrincipalMultiple<unknown>;
  readonly weight: NumberValue | null; readonly factors: readonly GeometricAlgebraicLogFactor[];
  readonly value: unknown | null; readonly conditions: readonly AlgebraicCondition<unknown>[];
}
export type GeometricAlgebraicLogarithms<E, R extends AlgebraicResidueRelationsData<E> = AlgebraicResidueRelations<E>> = Readonly<{
  relations: R; components: readonly GeometricAlgebraicLogComponent[]; activeDerivative: unknown;
} & (
  {kind: 'non-torsion'; obstruction: number; later: 'unperformed'} |
  {kind: 'complete'; descent: AlgebraicConstantValueConversion<E> | null; nativeDerivative: E; primitive: NativeAlgebraicPrimitive<E>}
)>;
function sources(f: ExactField<unknown>, factors: readonly GeometricAlgebraicLogFactor[], index: number) {
  return factors.map((p, j) => ({field: f, value: p.value, nonzero: true, path: `logarithmic.component.${index}.factor.${j}`}));
}
function componentValue(ctx: ExecutionContext, curve: AlgebraicCurveView<unknown>, weight: NumberValue, factors: readonly GeometricAlgebraicLogFactor[]) {
  const f = curve.owner; let sum = f.fromInteger(ctx, 0n);
  for (const p of factors) sum = f.add(ctx, sum, f.multiply(ctx, f.fromInteger(ctx, p.exponent), f.multiply(ctx, p.derivative.derivative, p.inverse)));
  const mapped = curve.coordinates.scalarNative(ctx, curve.coordinates.scalar.fromCoefficient(ctx, weight));
  return f.multiply(ctx, mapped, sum);
}
export function verifyGeometricAlgebraicLogarithmDataWithin<E, R extends AlgebraicResidueRelationsData<E>>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, relations: R, proof: GeometricAlgebraicLogarithms<E, R>, bounds: DifferentialBounds, verifyRelations: () => void): void {
  demand(proof.relations === relations && relations.splitting.source === source, 'domain-mismatch', 'geometric logarithms exact source/relations');
  verifyRelations();
  const split = relations.splitting, curve = split.curve, f = curve.owner, C = curve.coordinates.constantOwner, count = relations.basis.length;
  const coverage = proof.kind === 'complete' ? count : proof.obstruction + 1;
  demand(Number.isSafeInteger(coverage) && coverage >= 0 && coverage <= count && proof.components.length === coverage, 'verification-failed', 'geometric logarithm ordered prefix coverage');
  let sum = f.fromInteger(ctx, 0n);
  for (let i = 0; i < coverage; i++) {
    const p = proof.components[i]; demand(p.index === i, 'verification-failed', 'geometric logarithm component order');
    verifyAlgebraicPrincipalMultipleWithin(ctx, curve, relations.divisors[i], p.multiple, bounds); const order = principalMultipleOrder(ctx, p.multiple);
    if (order === null) {
      demand(proof.kind === 'non-torsion' && proof.obstruction === i && i === coverage - 1 && proof.later === 'unperformed'
        && p.weight === null && p.value === null && p.factors.length === 0 && p.conditions.length === 0, 'verification-failed', 'geometric first non-torsion obstruction'); continue;
    }
    demand(p.weight !== null && p.value !== null, 'verification-failed', 'geometric positive logarithm coordinates');
    const weight = C.exactDivide(ctx, relations.basis[i], C.fromInteger(ctx, ctx.multiply(relations.denominator, order)));
    demand(C.equal(ctx, weight, p.weight), 'verification-failed', 'geometric logarithm residue/order scaling');
    const expected = principalMultipleFactors(ctx, p.multiple);
    demand(expected.length === p.factors.length, 'verification-failed', 'geometric complete factored witness coverage');
    for (let j = 0; j < expected.length; j++) {
      const factor = p.factors[j]; ctx.integer(factor.exponent);
      demand(factor.exponent === expected[j].exponent && f.equal(ctx, factor.value, expected[j].value) && !f.isZero(ctx, factor.value)
        && f.equal(ctx, f.multiply(ctx, factor.value, factor.inverse), f.fromInteger(ctx, 1n)), 'verification-failed', 'geometric factor correspondence/unit');
      verifyAlgebraicDerivativeWithin(ctx, f, factor.value, factor.derivative, bounds);
    }
    const value = componentValue(ctx, curve, weight, p.factors);
    demand(f.equal(ctx, value, p.value), 'verification-failed', 'geometric logarithm independent derivative'); sum = f.add(ctx, sum, value);
    ctx.allocate(p.factors.length); verifyAlgebraicConditions(ctx, f, sources(f, p.factors, i), p.conditions, bounds);
  }
  demand(f.equal(ctx, sum, proof.activeDerivative), 'verification-failed', 'geometric logarithm complete active prefix');
  if (proof.kind === 'non-torsion') return;
  const primitive = proof.primitive;
  demand(primitive.base.curve === source && source.owner.isZero(ctx, primitive.base.fieldPart), 'domain-mismatch', 'geometric primitive exact original owner/field part');
  if (split.quotient === null) {
    demand(proof.descent === null && f === source.owner && source.owner.equal(ctx, proof.nativeDerivative, sum as E)
      && primitive.base.terms.length === 0 && primitive.terms.length === count, 'verification-failed', 'geometric identity trace/descent coverage');
    for (let i = 0; i < count; i++) {
      const term = primitive.terms[i], p = proof.components[i]; verifyNativeAlgebraicLogTermWithin(ctx, source, term, bounds);
      demand(C.equal(ctx, term.weight, p.weight!) && term.factors.length === p.factors.length && term.factors.every((v, j) => v.exponent === p.factors[j].exponent
        && f.equal(ctx, v.value, p.factors[j].value)), 'verification-failed', 'geometric native logarithm term mapping');
    }
  } else {
    const q = split.quotient;
    demand(proof.descent !== null && primitive.terms.length === 0 && primitive.base.terms.length === count, 'verification-failed', 'geometric nontrivial relative trace coverage');
    verifyAlgebraicConstantValueConversion(ctx, q, sum as ConstantBaseChangeValue, proof.descent);
    demand(proof.descent.polynomial.coefficients.slice(1).every(c => source.owner.isZero(ctx, c)) && source.owner.equal(ctx, proof.nativeDerivative, proof.descent.polynomial.coefficients[0] ?? source.owner.fromInteger(ctx, 0n)), 'verification-failed', 'geometric complete native constant descent');
    for (let i = 0; i < count; i++) {
      const term = primitive.base.terms[i], p = proof.components[i]; verifyAlgebraicTraceLogTermWithin(ctx, source, term, i, bounds);
      demand(term.quotient === q && C.equal(ctx, term.weight, p.weight!) && C.equal(ctx, term.unit, C.fromInteger(ctx, 1n)) && term.factors.length === p.factors.length
        && term.factors.every((v, j) => v.exponent === p.factors[j].exponent && f.equal(ctx, v.value, p.factors[j].value)), 'verification-failed', 'geometric normalized relative trace term mapping');
    }
  }
}
export function constructGeometricAlgebraicLogarithmDataWithin<E, R extends AlgebraicResidueRelationsData<E>>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, relations: R, bounds: DifferentialBounds, verifyRelations: () => void): GeometricAlgebraicLogarithms<E, R> {
  demand(relations.splitting.source === source, 'domain-mismatch', 'geometric logarithm source owner'); verifyRelations();
  const split = relations.splitting, curve = split.curve, f = curve.owner, C = curve.coordinates.constantOwner, components: GeometricAlgebraicLogComponent[] = []; let activeDerivative = f.fromInteger(ctx, 0n);
  for (let i = 0; i < relations.basis.length; i++) {
    const multiple = decideAlgebraicPrincipalMultipleWithin(ctx, curve, relations.divisors[i], bounds), order = principalMultipleOrder(ctx, multiple); ctx.allocate(6);
    if (order === null) {
      components.push(Object.freeze({index: i, multiple, weight: null, factors: Object.freeze([]), value: null, conditions: Object.freeze([])})); ctx.allocate(components.length + 6);
      const proof = Object.freeze({relations, components: Object.freeze([...components]), activeDerivative, kind: 'non-torsion' as const, obstruction: i, later: 'unperformed' as const});
      verifyGeometricAlgebraicLogarithmDataWithin(ctx, source, relations, proof, bounds, verifyRelations); return proof;
    }
    const weight = C.exactDivide(ctx, relations.basis[i], C.fromInteger(ctx, ctx.multiply(relations.denominator, order))), witness = principalMultipleFactors(ctx, multiple); ctx.allocate(witness.length);
    const factors = Object.freeze(witness.map(p => {ctx.allocate(4); return Object.freeze({...p, inverse: principalMultipleFactorInverse(ctx, curve, multiple, p.value), derivative: differentiateAlgebraicWithin(ctx, f, p.value, bounds)});}));
    const value = componentValue(ctx, curve, weight, factors); activeDerivative = f.add(ctx, activeDerivative, value); ctx.allocate(factors.length);
    components.push(Object.freeze({index: i, multiple, weight, factors, value, conditions: algebraicConditions(ctx, f, sources(f, factors, i), bounds)}));
  }
  ctx.allocate(components.length + 7);
  const q = split.quotient, descent = q === null ? null : convertAlgebraicConstantValue(ctx, q, activeDerivative as ConstantBaseChangeValue), nativeDerivative = descent === null ? activeDerivative as E : descent.polynomial.coefficients[0] ?? source.owner.fromInteger(ctx, 0n);
  const base = constructAlgebraicPrimitiveWithin(ctx, source, source.owner.fromInteger(ctx, 0n), q === null ? [] : components.map(p => ({quotient: q, weight: p.weight!, unit: C.fromInteger(ctx, 1n), factors: p.factors.map(v => ({value: v.value as ConstantBaseChangeValue, exponent: v.exponent}))})), bounds);
  const inputs: readonly NativeAlgebraicLogInput<E>[] = q === null ? components.map(p => ({weight: p.weight!, factors: p.factors.map(v => ({value: v.value as E, exponent: v.exponent, inverse: v.inverse as E}))})) : [];
  const primitive = constructNativeAlgebraicPrimitiveWithin(ctx, source, base, inputs, bounds), proof = Object.freeze({relations, components: Object.freeze(components), activeDerivative, kind: 'complete' as const, descent, nativeDerivative, primitive});
  verifyGeometricAlgebraicLogarithmDataWithin(ctx, source, relations, proof, bounds, verifyRelations); return proof;
}

export function verifyGeometricAlgebraicLogarithmsWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, relations: AlgebraicResidueRelations<E>, proof: GeometricAlgebraicLogarithms<E>, bounds: DifferentialBounds): void {
  verifyGeometricAlgebraicLogarithmDataWithin(ctx, source, relations, proof, bounds, () => verifyAlgebraicResidueRelationsWithin(ctx, relations.splitting, relations, bounds));
}
export function constructGeometricAlgebraicLogarithmsWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, relations: AlgebraicResidueRelations<E>, bounds: DifferentialBounds): GeometricAlgebraicLogarithms<E> {
  return constructGeometricAlgebraicLogarithmDataWithin(ctx, source, relations, bounds, () => verifyAlgebraicResidueRelationsWithin(ctx, relations.splitting, relations, bounds));
}
