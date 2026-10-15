/** Identity relative traces over the certified actual constants. Nontrivial
 * constant extensions keep the original all-embedding trace representation. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {ExactField} from './field';
import {verifyAlgebraicCurveWithin, type AlgebraicCurveView} from './algebraic-curve';
import type {CurveConstant} from './algebraic-curve-coordinates';
import {algebraicConditions, algebraicConstructionSources, verifyAlgebraicConditions, type AlgebraicCondition, type AlgebraicConditionSource} from './algebraic-conditions';
import {differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative} from './algebraic-derivative';
import {assembleAlgebraicPrimitiveWithin, differentiateAlgebraicPrimitiveWithin, verifyAlgebraicPrimitiveWithin,
  type AlgebraicPrimitive, type AlgebraicPrimitiveDerivative} from './algebraic-primitive';

export interface NativeAlgebraicLogInput<E> {
  readonly weight: CurveConstant;
  readonly factors: readonly Readonly<{value: E; exponent: bigint; inverse?: E}>[];
}
export interface NativeAlgebraicLogFactor<E> {
  readonly value: E; readonly exponent: bigint; readonly inverse: E; readonly norm: E;
}
export interface NativeAlgebraicLogTerm<E> {
  readonly kind: 'identity-relative-trace'; readonly degree: 1;
  readonly weight: CurveConstant; readonly embeddedWeight: E;
  readonly weightDerivative: AlgebraicDerivative<E>;
  readonly factors: readonly NativeAlgebraicLogFactor<E>[];
}
export interface NativeAlgebraicPrimitive<E> {
  readonly kind: 'native-and-relative-trace'; readonly base: AlgebraicPrimitive<E>;
  readonly terms: readonly NativeAlgebraicLogTerm<E>[];
  readonly conditions: readonly AlgebraicCondition<E>[];
}
export interface NativeAlgebraicLogDerivative<E> {
  readonly factors: readonly AlgebraicDerivative<E>[];
  readonly logarithmicDerivative: E; readonly column: E; readonly trace: E; readonly newtonSum: E;
}
export interface NativeAlgebraicPrimitiveDerivative<E> {
  readonly base: AlgebraicPrimitiveDerivative<E>; readonly terms: readonly NativeAlgebraicLogDerivative<E>[];
  readonly derivative: E;
}
const primitives = new WeakSet<object>();
function embedWeight<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, weight: CurveConstant): E {
  curve.coordinates.constantOwner.assert(ctx, weight);
  return curve.coordinates.scalarNative(ctx, curve.coordinates.scalar.fromCoefficient(ctx, weight));
}
function sources<E>(ctx: ExecutionContext, base: AlgebraicPrimitive<E>, terms: readonly NativeAlgebraicLogTerm<E>[]): readonly AlgebraicConditionSource[] {
  const f = base.curve.owner, out: AlgebraicConditionSource[] = [...algebraicConstructionSources(ctx, f), {field: f as ExactField<unknown>, value: base.fieldPart, path: 'primitive.field'}];
  ctx.allocate(terms.length + 1);
  for (let i = 0; i < terms.length; i++) {
    ctx.allocate(1 + 2 * terms[i].factors.length);
    out.push({field: f as ExactField<unknown>, value: terms[i].embeddedWeight, path: `primitive.native-log.${i}.weight`});
    for (let j = 0; j < terms[i].factors.length; j++) {
      const p = terms[i].factors[j];
      out.push({field: f as ExactField<unknown>, value: p.value, nonzero: true, path: `primitive.native-log.${i}.factor.${j}`},
        {field: f as ExactField<unknown>, value: p.norm, nonzero: true, path: `primitive.native-log.${i}.norm.${j}`});
    }
  }
  return Object.freeze(out.map(p => Object.freeze(p)));
}
export function verifyNativeAlgebraicLogTermWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, term: NativeAlgebraicLogTerm<E>, bounds: DifferentialBounds): void {
  const f = curve.owner, one = f.fromInteger(ctx, 1n);
  demand(term.kind === 'identity-relative-trace' && term.degree === 1, 'verification-failed', 'native logarithm identity relative extension');
  const weight = embedWeight(ctx, curve, term.weight);
  demand(f.equal(ctx, weight, term.embeddedWeight), 'verification-failed', 'native logarithm actual constant embedding');
  verifyAlgebraicDerivativeWithin(ctx, f, weight, term.weightDerivative, bounds);
  demand(f.isZero(ctx, term.weightDerivative.derivative), 'verification-failed', 'native logarithm constant weight derivative');
  for (const p of term.factors) {
    ctx.tick(); ctx.integer(p.exponent); f.assert(ctx, p.value); f.assert(ctx, p.inverse); f.assert(ctx, p.norm);
    demand(!f.isZero(ctx, p.value) && f.equal(ctx, f.multiply(ctx, p.value, p.inverse), one), 'verification-failed', 'native logarithm checked factor unit');
    // For K/K, multiplication by G has matrix [G]. Its determinant and the
    // resultant of z and G are both G; no auxiliary field or ring is invented.
    demand(f.equal(ctx, p.norm, p.value), 'verification-failed', 'native logarithm degree-one norm');
  }
}
export function reconstructNativeAlgebraicPrimitiveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, base: AlgebraicPrimitive<E>, terms: readonly NativeAlgebraicLogTerm<E>[], conditions: readonly AlgebraicCondition<E>[], bounds: DifferentialBounds): NativeAlgebraicPrimitive<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds);
  demand(base.curve === curve, 'domain-mismatch', 'native primitive original curve');
  // This rechecks all original trace terms and restriction coverage without
  // regenerating inverses, norms or differentiation evidence.
  const checked = assembleAlgebraicPrimitiveWithin(ctx, curve, base.fieldPart, base.terms, bounds);
  demand(base.conditions.length === checked.conditions.length && base.conditions.every((p, i) => p.kind === checked.conditions[i].kind && p.path === checked.conditions[i].path && curve.owner.equal(ctx, p.value, checked.conditions[i].value)), 'verification-failed', 'native primitive embedded restriction coverage');
  for (const term of terms) verifyNativeAlgebraicLogTermWithin(ctx, curve, term, bounds);
  verifyAlgebraicConditions(ctx, curve.owner, sources(ctx, base, terms), conditions, bounds);
  ctx.allocate(terms.length + conditions.length + 4);
  const result = Object.freeze({kind: 'native-and-relative-trace' as const, base: checked, terms: Object.freeze([...terms]), conditions: Object.freeze([...conditions])});
  primitives.add(result); return result;
}
export function constructNativeAlgebraicPrimitiveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, base: AlgebraicPrimitive<E>, input: readonly NativeAlgebraicLogInput<E>[], bounds: DifferentialBounds): NativeAlgebraicPrimitive<E> {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const f = curve.owner; ctx.allocate(input.length);
  const terms = Object.freeze(input.map(t => {
    const embeddedWeight = embedWeight(ctx, curve, t.weight), weightDerivative = differentiateAlgebraicWithin(ctx, f, embeddedWeight, bounds);
    ctx.allocate(t.factors.length);
    const factors = Object.freeze(t.factors.map(p => {
      ctx.integer(p.exponent); f.assert(ctx, p.value); demand(!f.isZero(ctx, p.value), 'division-by-zero', 'native logarithm factor');
      const inverse = p.inverse ?? f.inverse(ctx, p.value); ctx.allocate(4);
      return Object.freeze({value: p.value, exponent: p.exponent, inverse, norm: p.value});
    }));
    ctx.allocate(6); return Object.freeze({kind: 'identity-relative-trace' as const, degree: 1 as const, weight: t.weight, embeddedWeight, weightDerivative, factors});
  }));
  return reconstructNativeAlgebraicPrimitiveWithin(ctx, curve, base, terms, algebraicConditions(ctx, f, sources(ctx, base, terms), bounds), bounds);
}
/** Reuse exact checked logarithm evidence when adding the Hermite field part. */
export function assembleNativeAlgebraicPrimitiveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, base: AlgebraicPrimitive<E>, terms: readonly NativeAlgebraicLogTerm<E>[], bounds: DifferentialBounds): NativeAlgebraicPrimitive<E> {
  return reconstructNativeAlgebraicPrimitiveWithin(ctx, curve, base, terms, algebraicConditions(ctx, curve.owner, sources(ctx, base, terms), bounds), bounds);
}
function logarithmicDerivative<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, term: NativeAlgebraicLogTerm<E>, derivatives: readonly AlgebraicDerivative<E>[]): E {
  const f = curve.owner; let sum = f.fromInteger(ctx, 0n);
  for (let i = 0; i < term.factors.length; i++) {
    const p = term.factors[i]; ctx.tick();
    sum = f.add(ctx, sum, f.multiply(ctx, f.fromInteger(ctx, p.exponent), f.multiply(ctx, derivatives[i].derivative, p.inverse)));
  }
  return f.multiply(ctx, term.embeddedWeight, sum);
}
export function verifyNativeAlgebraicPrimitiveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, primitive: NativeAlgebraicPrimitive<E>, target: E, proof: NativeAlgebraicPrimitiveDerivative<E>, bounds: DifferentialBounds): void {
  verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); const f = curve.owner; f.assert(ctx, target);
  demand(primitives.has(primitive) && primitive.kind === 'native-and-relative-trace' && primitive.base.curve === curve, 'domain-mismatch', 'registered native primitive');
  demand(proof.terms.length === primitive.terms.length, 'verification-failed', 'native logarithm derivative complete term coverage');
  verifyAlgebraicPrimitiveWithin(ctx, curve, primitive.base, proof.base.derivative, proof.base, bounds); let value = proof.base.derivative;
  for (let i = 0; i < primitive.terms.length; i++) {
    const term = primitive.terms[i], p = proof.terms[i]; verifyNativeAlgebraicLogTermWithin(ctx, curve, term, bounds);
    demand(p.factors.length === term.factors.length, 'verification-failed', 'native logarithm derivative complete factor coverage');
    for (let j = 0; j < term.factors.length; j++) verifyAlgebraicDerivativeWithin(ctx, f, term.factors[j].value, p.factors[j], bounds);
    const derivative = logarithmicDerivative(ctx, curve, term, p.factors);
    demand(f.equal(ctx, derivative, p.logarithmicDerivative) && f.equal(ctx, derivative, p.column) && f.equal(ctx, p.trace, p.column), 'verification-failed', 'native logarithm multiplication-basis trace');
    // The characteristic polynomial is z-h; Newton's first identity gives h.
    const characteristicConstant = f.negate(ctx, derivative), newton = f.negate(ctx, characteristicConstant);
    demand(f.equal(ctx, newton, p.newtonSum) && f.equal(ctx, p.newtonSum, p.trace), 'verification-failed', 'native logarithm independent Newton trace');
    value = f.add(ctx, value, p.trace);
  }
  verifyAlgebraicConditions(ctx, f, sources(ctx, primitive.base, primitive.terms), primitive.conditions, bounds);
  demand(f.equal(ctx, value, proof.derivative) && f.equal(ctx, value, target), 'verification-failed', 'native primitive independent explicit target');
}
export function differentiateNativeAlgebraicPrimitiveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, primitive: NativeAlgebraicPrimitive<E>, bounds: DifferentialBounds): NativeAlgebraicPrimitiveDerivative<E> {
  demand(primitives.has(primitive) && primitive.base.curve === curve, 'domain-mismatch', 'registered native primitive derivative');
  const base = differentiateAlgebraicPrimitiveWithin(ctx, curve, primitive.base, bounds); let derivative = base.derivative; ctx.allocate(primitive.terms.length);
  const terms = Object.freeze(primitive.terms.map(term => {
    verifyNativeAlgebraicLogTermWithin(ctx, curve, term, bounds); ctx.allocate(term.factors.length + 5);
    const factors = Object.freeze(term.factors.map(p => differentiateAlgebraicWithin(ctx, curve.owner, p.value, bounds))), value = logarithmicDerivative(ctx, curve, term, factors);
    derivative = curve.owner.add(ctx, derivative, value);
    return Object.freeze({factors, logarithmicDerivative: value, column: value, trace: value, newtonSum: value});
  }));
  ctx.allocate(3); const proof = Object.freeze({base, terms, derivative}); verifyNativeAlgebraicPrimitiveWithin(ctx, curve, primitive, derivative, proof, bounds); return proof;
}
export function constructNativeAlgebraicPrimitive<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, base: AlgebraicPrimitive<E>, terms: readonly NativeAlgebraicLogInput<E>[], bounds: DifferentialBounds) {
  return ctx.operation(() => constructNativeAlgebraicPrimitiveWithin(ctx, curve, base, terms, bounds));
}
export function differentiateNativeAlgebraicPrimitive<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, primitive: NativeAlgebraicPrimitive<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => differentiateNativeAlgebraicPrimitiveWithin(ctx, curve, primitive, bounds));
}
export function verifyNativeAlgebraicPrimitive<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, primitive: NativeAlgebraicPrimitive<E>, target: E, proof: NativeAlgebraicPrimitiveDerivative<E>, bounds: DifferentialBounds) {
  ctx.operation(() => verifyNativeAlgebraicPrimitiveWithin(ctx, curve, primitive, target, proof, bounds));
}
