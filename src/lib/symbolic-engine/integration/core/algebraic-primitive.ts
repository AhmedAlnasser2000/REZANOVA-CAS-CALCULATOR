import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import type { Polynomial } from './polynomial';
import type { ExactField } from './field';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import type { ConstantBaseChangeValue } from './algebraic-curve-base-change';
import { verifyAlgebraicConstantQuotientWithin, constantQuotientWeight, convertAlgebraicConstantValue, verifyAlgebraicConstantValueConversion,
  type AlgebraicConstantQuotient, type AlgebraicConstantValueConversion } from './algebraic-constant-quotient';
import type { NumberValue } from './relative-number-field';
import { differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative } from './algebraic-derivative';
import type { UnitAnalysis } from './quotient-algebra';
import { quotientTrace, verifyQuotientTrace, type TraceCertificate } from './quotient-trace';
import { subresultants, verifySubresultants, type SubresultantCertificate } from './subresultant';
import { invertExactMatrix, verifyExactMatrixInverse, determinantFromInverse, freezeExactMatrix, type MatrixInverse } from './algebraic-matrix';
import { algebraicConditions, verifyAlgebraicConditions, algebraicConstructionSources, type AlgebraicCondition } from './algebraic-conditions';
import { recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence } from './rational-gcd-evidence';

export interface AlgebraicTraceLogFactor<E> {
  readonly value: ConstantBaseChangeValue;
  readonly exponent: bigint;
  readonly conversion: AlgebraicConstantValueConversion<E>;
  readonly inverse: UnitAnalysis<E>;
  readonly normEvidence: SubresultantCertificate<E, ExactField<E>>;
  readonly normMatrix: MatrixInverse<E>;
  readonly norm: E;
}
export interface AlgebraicTraceLogTerm<E> {
  readonly quotient: AlgebraicConstantQuotient<E>;
  readonly weight: NumberValue;
  readonly unit: NumberValue;
  readonly weightDerivative: AlgebraicDerivative<ConstantBaseChangeValue>;
  readonly unitDerivative: AlgebraicDerivative<ConstantBaseChangeValue>;
  readonly factors: readonly AlgebraicTraceLogFactor<E>[];
  readonly conditions: readonly AlgebraicCondition<ConstantBaseChangeValue>[];
}
export interface AlgebraicTraceLogInput<E> {
  readonly quotient: AlgebraicConstantQuotient<E>;
  readonly weight: NumberValue;
  readonly unit: NumberValue;
  readonly factors: readonly Readonly<{value: ConstantBaseChangeValue; exponent: bigint}>[];
}
export interface AlgebraicPrimitive<E> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly curve: AlgebraicCurveView<E>;
  readonly fieldPart: E;
  readonly terms: readonly AlgebraicTraceLogTerm<E>[];
  readonly conditions: readonly AlgebraicCondition<E>[];
}
const primitives = new WeakSet<object>();
export function withAlgebraicPrimitiveArithmeticWithin<E>(ctx: ExecutionContext, primitive: AlgebraicPrimitive<E>, arithmetic: RationalGcdEvidence): AlgebraicPrimitive<E> {
  ctx.allocate(5); demand(primitives.has(primitive), 'domain-mismatch', 'registered primitive arithmetic binding'); const result = Object.freeze({...primitive, arithmetic}); primitives.add(result); return result;
}
function constantValue<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, value: NumberValue) {
  q.relative.target.assert(ctx, value); return q.change.coordinates.scalarNative(ctx, q.change.coordinates.scalar.fromCoefficient(ctx, value));
}
function normMatrix<E>(ctx: ExecutionContext, q: AlgebraicConstantQuotient<E>, value: Polynomial<E>) {
  const r = q.algebra.ring, f = q.curve.owner, n = q.relative.degree; ctx.allocate(n * n);
  const columns = Array.from({length: n}, (_, i) => q.algebra.make(ctx, r.make(ctx, [...Array<E>(i).fill(f.fromInteger(ctx, 0n)), ...value.coefficients])).representative);
  return freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => columns.map(p => p.coefficients[i] ?? f.fromInteger(ctx, 0n))));
}
function argumentConditions<E>(ctx: ExecutionContext, term: Pick<AlgebraicTraceLogTerm<E>, 'quotient' | 'factors'>, index: number, bounds: DifferentialBounds) {
  const f = term.quotient.change.field; return algebraicConditions(ctx, f, term.factors.map((p, j) => ({field: f as ExactField<unknown>, value: p.value, path: `primitive.log.${index}.factor.${j}`})), bounds);
}
function primitiveConditions<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, fieldPart: E, terms: readonly AlgebraicTraceLogTerm<E>[], bounds: DifferentialBounds) {
  const f = curve.owner; return algebraicConditions(ctx, f, [...algebraicConstructionSources(ctx, f), {field: f as ExactField<unknown>, value: fieldPart, path: 'primitive.field'},
    ...terms.flatMap((term, i) => term.factors.map((p, j) => ({field: f as ExactField<unknown>, value: p.norm, nonzero: true, path: `primitive.log.${i}.norm.${j}`})))], bounds);
}
export function verifyAlgebraicTraceLogTermWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, term: AlgebraicTraceLogTerm<E>, index: number, bounds: DifferentialBounds): void {
  const q = term.quotient; demand(q.curve === curve, 'domain-mismatch', 'primitive trace-log original curve'); verifyAlgebraicConstantQuotientWithin(ctx, q, bounds);
  q.relative.target.assert(ctx, term.weight); q.relative.target.assert(ctx, term.unit); demand(!q.relative.target.isZero(ctx, term.unit), 'invalid-input', 'zero constant logarithm argument unit');
  const unit = constantValue(ctx, q, term.unit), weight = constantValue(ctx, q, term.weight);
  verifyAlgebraicDerivativeWithin(ctx, q.change.field, unit, term.unitDerivative, bounds); verifyAlgebraicDerivativeWithin(ctx, q.change.field, weight, term.weightDerivative, bounds);
  demand(q.change.field.isZero(ctx, term.unitDerivative.derivative) && q.change.field.isZero(ctx, term.weightDerivative.derivative), 'verification-failed', 'primitive full constant construction derivatives');
  for (const p of term.factors) {
    ctx.integer(p.exponent); verifyAlgebraicConstantValueConversion(ctx, q, p.value, p.conversion);
    demand(p.inverse.kind === 'unit', 'invalid-input', 'logarithm argument vanishes on a component');
    q.algebra.verifyUnit(ctx, q.algebra.make(ctx, p.conversion.polynomial), p.inverse);
    verifySubresultants(ctx, q.algebra.ring, q.algebra.modulus, p.conversion.polynomial, p.normEvidence);
    verifyExactMatrixInverse(ctx, curve.owner, normMatrix(ctx, q, p.conversion.polynomial), p.normMatrix);
    demand(curve.owner.equal(ctx, p.norm, p.normEvidence.resultant) && curve.owner.equal(ctx, p.norm, determinantFromInverse(ctx, curve.owner, p.normMatrix))
      && !curve.owner.isZero(ctx, p.norm), 'verification-failed', 'primitive independent relative norm identities');
  }
  verifyAlgebraicConditions(ctx, q.change.field, term.factors.map((p, j) => ({field: q.change.field as ExactField<unknown>, value: p.value, path: `primitive.log.${index}.factor.${j}`})), term.conditions, bounds);
}
export function constructAlgebraicTraceLogTermWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: AlgebraicTraceLogInput<E>, index: number, bounds: DifferentialBounds): AlgebraicTraceLogTerm<E> {
  const q = input.quotient; demand(q.curve === curve, 'domain-mismatch', 'trace logarithm original curve'); verifyAlgebraicConstantQuotientWithin(ctx, q, bounds);
  const weightDerivative = differentiateAlgebraicWithin(ctx, q.change.field, constantValue(ctx, q, input.weight), bounds), unitDerivative = differentiateAlgebraicWithin(ctx, q.change.field, constantValue(ctx, q, input.unit), bounds);
  ctx.allocate(input.factors.length); const factors = Object.freeze(input.factors.map(p => {
    ctx.integer(p.exponent); const conversion = convertAlgebraicConstantValue(ctx, q, p.value), inverse = q.algebra.analyzeUnit(ctx, q.algebra.make(ctx, conversion.polynomial));
    demand(inverse.kind === 'unit', 'invalid-input', 'nonzero formal logarithm argument');
    const normEvidence = subresultants(ctx, q.algebra.ring, q.algebra.modulus, conversion.polynomial), matrix = invertExactMatrix(ctx, curve.owner, normMatrix(ctx, q, conversion.polynomial));
    demand(matrix !== null, 'verification-failed', 'logarithm argument full multiplication rank');
    return Object.freeze({value: p.value, exponent: p.exponent, conversion, inverse, normEvidence, normMatrix: matrix, norm: normEvidence.resultant});
  }));
  const term = Object.freeze({quotient: q, weight: input.weight, unit: input.unit, weightDerivative, unitDerivative, factors,
    conditions: argumentConditions(ctx, {quotient: q, factors}, index, bounds)});
  verifyAlgebraicTraceLogTermWithin(ctx, curve, term, index, bounds); return term;
}
export function reconstructAlgebraicPrimitiveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, fieldPart: E, terms: readonly AlgebraicTraceLogTerm<E>[], conditions: readonly AlgebraicCondition<E>[], bounds: DifferentialBounds): AlgebraicPrimitive<E> {
  curve.owner.assert(ctx, fieldPart); for (let i = 0; i < terms.length; i++) verifyAlgebraicTraceLogTermWithin(ctx, curve, terms[i], i, bounds);
  const expected = primitiveConditions(ctx, curve, fieldPart, terms, bounds);
  demand(conditions.length === expected.length && conditions.every((p, i) => p.kind === expected[i].kind && p.path === expected[i].path && curve.owner.equal(ctx, p.value, expected[i].value)), 'verification-failed', 'primitive retained condition coverage');
  ctx.allocate(terms.length + 4); const result = Object.freeze({curve, fieldPart, terms: Object.freeze([...terms]), conditions: Object.freeze([...conditions])}); primitives.add(result); return result;
}
export function constructAlgebraicPrimitiveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, fieldPart: E, input: readonly AlgebraicTraceLogInput<E>[], bounds: DifferentialBounds): AlgebraicPrimitive<E> {
  const terms = Object.freeze(input.map((t, i) => constructAlgebraicTraceLogTermWithin(ctx, curve, t, i, bounds)));
  return reconstructAlgebraicPrimitiveWithin(ctx, curve, fieldPart, terms, primitiveConditions(ctx, curve, fieldPart, terms, bounds), bounds);
}
/** Compose already checked terms without regenerating their inverses or norms. */
export function assembleAlgebraicPrimitiveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, fieldPart: E, terms: readonly AlgebraicTraceLogTerm<E>[], bounds: DifferentialBounds): AlgebraicPrimitive<E> {
  return reconstructAlgebraicPrimitiveWithin(ctx, curve, fieldPart, terms, primitiveConditions(ctx, curve, fieldPart, terms, bounds), bounds);
}
export interface AlgebraicTraceLogDerivative<E> {
  readonly factors: readonly Readonly<{derivative: AlgebraicDerivative<ConstantBaseChangeValue>; conversion: AlgebraicConstantValueConversion<E>}>[];
  readonly polynomial: Polynomial<E>;
  readonly trace: TraceCertificate<E>;
}
export interface AlgebraicPrimitiveDerivative<E> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly field: AlgebraicDerivative<E>;
  readonly terms: readonly AlgebraicTraceLogDerivative<E>[];
  readonly derivative: E;
}
function logDerivative<E>(ctx: ExecutionContext, term: AlgebraicTraceLogTerm<E>, conversions: readonly AlgebraicConstantValueConversion<E>[]) {
  const q = term.quotient, a = q.algebra, r = a.ring; let out = a.fromInteger(ctx, 0n);
  for (let i = 0; i < term.factors.length; i++) {
    const p = term.factors[i]; demand(p.inverse.kind === 'unit', 'verification-failed', 'retained logarithm factor inverse');
    const part = a.multiply(ctx, a.make(ctx, conversions[i].polynomial), p.inverse.inverse);
    out = a.add(ctx, out, a.make(ctx, r.scale(ctx, part.representative, q.curve.owner.fromInteger(ctx, p.exponent))));
  }
  return a.multiply(ctx, out, a.make(ctx, constantQuotientWeight(ctx, q, term.weight)));
}
export function verifyAlgebraicPrimitiveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, primitive: AlgebraicPrimitive<E>, target: E, proof: AlgebraicPrimitiveDerivative<E>, bounds: DifferentialBounds): void {
  demand(primitives.has(primitive) && primitive.curve === curve, 'domain-mismatch', 'privately owned algebraic primitive'); curve.owner.assert(ctx, target);
  demand(primitive.terms.length === proof.terms.length, 'verification-failed', 'primitive complete logarithm derivative coverage');
  verifyAlgebraicDerivativeWithin(ctx, curve.owner, primitive.fieldPart, proof.field, bounds); let derivative = proof.field.derivative;
  for (let i = 0; i < primitive.terms.length; i++) {
    const term = primitive.terms[i], d = proof.terms[i], q = term.quotient; verifyAlgebraicTraceLogTermWithin(ctx, curve, term, i, bounds);
    demand(d.factors.length === term.factors.length, 'verification-failed', 'primitive full factored argument derivative coverage');
    for (let j = 0; j < d.factors.length; j++) {
      verifyAlgebraicDerivativeWithin(ctx, q.change.field, term.factors[j].value, d.factors[j].derivative, bounds);
      verifyAlgebraicConstantValueConversion(ctx, q, d.factors[j].derivative.derivative, d.factors[j].conversion);
    }
    const value = logDerivative(ctx, term, d.factors.map(v => v.conversion)); demand(q.algebra.ring.equal(ctx, value.representative, d.polynomial), 'verification-failed', 'primitive weighted logarithmic derivative mapping');
    verifyQuotientTrace(ctx, q.algebra, value, d.trace);
    derivative = curve.owner.add(ctx, derivative, curve.owner.exactDivide(ctx, d.trace.trace, curve.owner.fromInteger(ctx, BigInt(q.relative.degree))));
  }
  const expected = primitiveConditions(ctx, curve, primitive.fieldPart, primitive.terms, bounds);
  demand(expected.length === primitive.conditions.length && expected.every((p, i) => p.kind === primitive.conditions[i].kind && p.path === primitive.conditions[i].path && curve.owner.equal(ctx, p.value, primitive.conditions[i].value)), 'verification-failed', 'primitive full retained restrictions');
  demand(curve.owner.equal(ctx, derivative, proof.derivative) && curve.owner.equal(ctx, derivative, target), 'verification-failed', 'primitive independent explicit native target');
}
export function differentiateAlgebraicPrimitiveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, primitive: AlgebraicPrimitive<E>, bounds: DifferentialBounds): AlgebraicPrimitiveDerivative<E> {
  demand(primitives.has(primitive) && primitive.curve === curve, 'domain-mismatch', 'owned algebraic primitive');
  const field = differentiateAlgebraicWithin(ctx, curve.owner, primitive.fieldPart, bounds); let derivative = field.derivative; ctx.allocate(primitive.terms.length);
  const terms = Object.freeze(primitive.terms.map(term => {
    const q = term.quotient, factors = Object.freeze(term.factors.map(p => { const derivative = differentiateAlgebraicWithin(ctx, q.change.field, p.value, bounds); return Object.freeze({derivative, conversion: convertAlgebraicConstantValue(ctx, q, derivative.derivative)}); }));
    const value = logDerivative(ctx, term, factors.map(p => p.conversion)), trace = quotientTrace(ctx, q.algebra, value);
    derivative = curve.owner.add(ctx, derivative, curve.owner.exactDivide(ctx, trace.trace, curve.owner.fromInteger(ctx, BigInt(q.relative.degree))));
    return Object.freeze({factors, polynomial: value.representative, trace});
  }));
  const proof = Object.freeze({field, terms, derivative}); verifyAlgebraicPrimitiveWithin(ctx, curve, primitive, derivative, proof, bounds); return proof;
}
export function constructAlgebraicPrimitive<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, fieldPart: E, terms: readonly AlgebraicTraceLogInput<E>[], bounds: DifferentialBounds) {
  return ctx.operation(() => { const recorded = recordRationalGcdEvidence(ctx, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return constructAlgebraicPrimitiveWithin(ctx, curve, fieldPart, terms, bounds); });
    return withAlgebraicPrimitiveArithmeticWithin(ctx, recorded.value, recorded.evidence); });
}
export function differentiateAlgebraicPrimitive<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, primitive: AlgebraicPrimitive<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { demand(primitive.arithmetic !== undefined, 'verification-failed', 'primitive arithmetic coverage'); const recorded = recordRationalGcdEvidence(ctx, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return differentiateAlgebraicPrimitiveWithin(ctx, curve, primitive, bounds); }, primitive.arithmetic);
    return Object.freeze({...recorded.value, arithmetic: recorded.evidence}); });
}
export function verifyAlgebraicPrimitive<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, primitive: AlgebraicPrimitive<E>, target: E, proof: AlgebraicPrimitiveDerivative<E> & {readonly arithmetic?: RationalGcdEvidence}, bounds: DifferentialBounds): void {
  ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'primitive derivative complete arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicPrimitiveWithin(ctx, curve, primitive, target, proof, bounds); }); });
}
