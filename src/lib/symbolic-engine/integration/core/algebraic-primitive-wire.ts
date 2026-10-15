import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import type { AlgebraicField } from './algebraic-field';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { PolynomialRing } from './polynomial';
import { RationalFunctionField } from './rational-function';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { reconstructAlgebraicConstantBaseChangeWithin } from './algebraic-curve-base-change';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { auxiliaryAlgebraicCodec, matrixInverseCodec } from './algebraic-module-wire';
import { relativeNumberFieldCodec } from './number-field-wire';
import { reconstructAlgebraicConstantQuotientWithin, verifyAlgebraicConstantValueConversion, type AlgebraicConstantQuotient, type AlgebraicConstantValueConversion } from './algebraic-constant-quotient';
import { reconstructAlgebraicPrimitiveWithin, verifyAlgebraicPrimitiveWithin, withAlgebraicPrimitiveArithmeticWithin,
  type AlgebraicPrimitive, type AlgebraicPrimitiveDerivative, type AlgebraicTraceLogTerm, type AlgebraicTraceLogDerivative } from './algebraic-primitive';
import { encodeAlgebraicArithmeticArtifact, decodeAlgebraicArithmeticArtifact } from './algebraic-arithmetic-wire';
import * as w from './decision-wire-algebra';

export function algebraicConstantQuotientCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>, expectedConstants?: AlgebraicField<Rational>): w.EvidenceCodec<AlgebraicConstantQuotient<E>> {
  const {ctx, bounds} = s;
  const codec = s.memo<AlgebraicConstantQuotient<E>>('algebraic-constant-quotient' + (expectedConstants ? '-bound' : ''), curve, {encode(q) {
    demand(q.curve === curve && (expectedConstants === undefined || q.relative.target === expectedConstants), 'domain-mismatch', 'constant quotient codec complete expected construction'); const change = q.change, native = s.native(change.field);
    return Object.freeze({constants: auxiliaryAlgebraicCodec(ctx, Q, bounds).encode(change.constants), relative: relativeNumberFieldCodec(ctx, curve.coordinates.constantOwner, change.constants, bounds).encode(q.relative),
      lift: auxiliaryAlgebraicCodec(ctx, change.lift.parent, bounds).encode(change.lift), field: auxiliaryAlgebraicCodec(ctx, change.lift, bounds).encode(change.field),
      evidence: w.structure(ctx, {originalImages: w.list(ctx, native), basisImages: w.list(ctx, native), finite: s.order(change.coordinates.scalar, false), infinity: s.order(change.infinity.lattice.scalar, true)}).encode(change)});
  }, decode(v) {
    const raw = w.record(ctx, v, ['constants', 'relative', 'lift', 'field', 'evidence']), decoded = auxiliaryAlgebraicCodec(ctx, Q, bounds).decode(raw.constants), constants = expectedConstants ?? decoded;
    if (expectedConstants) {
      demand(constants.ring.variable === decoded.ring.variable && constants.ring.equal(ctx, constants.construction.relation, constants.ring.make(ctx, decoded.construction.relation.coefficients)), 'domain-mismatch', 'complete expected auxiliary constant construction');
      // The supplied expected owner gives an explicit generator image. Verify
      // the defining relation and every basis image; names alone never bind it.
      const embedding = AlgebraicEmbedding.extension(ctx, decoded, constants, AlgebraicEmbedding.rationals(ctx, constants, bounds), constants.generator(ctx), bounds);
      let power = decoded.fromInteger(ctx, 1n); for (let i = 0; i < decoded.ring.degree(ctx, decoded.modulus); i++) {
        demand(constants.equal(ctx, embedding.map(ctx, power), constants.make(ctx, constants.ring.make(ctx, power.representative.coefficients))), 'verification-failed', 'complete expected constant basis correspondence'); power = decoded.multiply(ctx, power, decoded.generator(ctx));
      }
    }
    const relative = relativeNumberFieldCodec(ctx, curve.coordinates.constantOwner, constants, bounds).decode(raw.relative);
    const base = new RationalFunctionField(new PolynomialRing(Q, curve.coordinates.scalar.ring.variable)), lift = auxiliaryAlgebraicCodec(ctx, base, bounds).decode(raw.lift), field = auxiliaryAlgebraicCodec(ctx, lift, bounds).decode(raw.field);
    const scalar = new RationalFunctionField(new PolynomialRing(constants, curve.coordinates.scalar.ring.variable)), infinity = new RationalFunctionField(new PolynomialRing(constants, curve.infinity.lattice.scalar.ring.variable)), native = s.native(field);
    const evidence = w.structure(ctx, {originalImages: w.list(ctx, native), basisImages: w.list(ctx, native), finite: s.order(scalar, false), infinity: s.order(infinity, true)}).decode(raw.evidence);
    const change = reconstructAlgebraicConstantBaseChangeWithin(ctx, curve, constants, relative.embedding, lift, field, scalar, evidence.originalImages, evidence.basisImages, evidence.finite, evidence.infinity, bounds);
    return reconstructAlgebraicConstantQuotientWithin(ctx, curve, change, relative, bounds);
  }});
  return {encode(q) { demand(q.curve === curve && (expectedConstants === undefined || q.relative.target === expectedConstants), 'domain-mismatch', 'cached exact constant-owner binding'); return codec.encode(q); },
    decode(v) { const q = codec.decode(v); demand(q.curve === curve && (expectedConstants === undefined || q.relative.target === expectedConstants), 'domain-mismatch', 'cached exact constant-owner binding'); return q; }};
}
export function algebraicConstantValueConversionCodec<E>(s: AlgebraicDivisorWireContext, q: AlgebraicConstantQuotient<E>): w.EvidenceCodec<AlgebraicConstantValueConversion<E>> {
  const {ctx} = s, target = s.scalar(q.change.coordinates.scalar), source = s.scalar(q.curve.coordinates.scalar), p = w.polynomial(ctx, q.scalarAlgebra.ring, source), native = s.native(q.curve.owner);
  const parts = w.structure(ctx, {input: s.native(q.change.field), scalars: w.list(ctx, w.structure(ctx, {input: target, numerator: p, denominator: p,
    inverse: w.unitEvidence(ctx, q.scalarAlgebra, p), coefficients: w.list(ctx, source)})), polynomial: w.polynomial(ctx, q.algebra.ring, native)});
  return s.memo('algebraic-constant-value-conversion', q, {encode: parts.encode, decode(v) { const proof = parts.decode(v); verifyAlgebraicConstantValueConversion(ctx, q, proof.input, proof); return proof; }});
}
export function algebraicTraceLogTermCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>, expectedConstants?: AlgebraicField<Rational>): w.EvidenceCodec<AlgebraicTraceLogTerm<E>> {
  const {ctx} = s, quotient = algebraicConstantQuotientCodec(s, curve, expectedConstants);
  const parts = (q: AlgebraicConstantQuotient<E>) => {
    const constant = s.native(q.relative.target), native = s.native(q.curve.owner), target = s.native(q.change.field), p = w.polynomial(ctx, q.algebra.ring, native);
    return w.structure(ctx, {weight: constant, unit: constant, weightDerivative: s.derivative(q.change.field), unitDerivative: s.derivative(q.change.field),
      factors: w.list(ctx, w.structure(ctx, {value: target, exponent: s.integer(), conversion: algebraicConstantValueConversionCodec(s, q), inverse: w.unitEvidence(ctx, q.algebra, p),
        normEvidence: w.prsEvidence(ctx, p, native), normMatrix: matrixInverseCodec(ctx, native), norm: native})), conditions: s.conditions(q.change.field)});
  };
  const codec = s.memo<AlgebraicTraceLogTerm<E>>('algebraic-trace-log-term' + (expectedConstants ? '-bound' : ''), curve, {encode(t) { return Object.freeze({quotient: quotient.encode(t.quotient), evidence: parts(t.quotient).encode(t)}); }, decode(v) {
    const raw = w.record(ctx, v, ['quotient', 'evidence']), q = quotient.decode(raw.quotient); return Object.freeze({quotient: q, ...parts(q).decode(raw.evidence)});
  }});
  const check = (t: AlgebraicTraceLogTerm<E>) => { ctx.tick(); demand(t.quotient.curve === curve && (expectedConstants === undefined || t.quotient.relative.target === expectedConstants), 'domain-mismatch', 'cached complete trace-log owner binding'); return t; };
  return {encode(t) { return codec.encode(check(t)); }, decode(v) { return check(codec.decode(v)); }};
}
export function algebraicPrimitiveCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>, expectedConstants?: AlgebraicField<Rational>): w.EvidenceCodec<AlgebraicPrimitive<E>> {
  const {ctx, bounds} = s, parts = w.structure(ctx, {fieldPart: s.native(curve.owner), terms: w.list(ctx, algebraicTraceLogTermCodec(s, curve, expectedConstants)), conditions: s.conditions(curve.owner)});
  const codec = s.memo<AlgebraicPrimitive<E>>('algebraic-primitive' + (expectedConstants ? '-bound' : ''), curve, {encode: parts.encode, decode(v) { const p = parts.decode(v); return reconstructAlgebraicPrimitiveWithin(ctx, curve, p.fieldPart, p.terms, p.conditions, bounds); }});
  const check = (p: AlgebraicPrimitive<E>) => { ctx.tick(p.terms.length + 1); demand(p.curve === curve && p.terms.every(t => t.quotient.curve === curve && (expectedConstants === undefined || t.quotient.relative.target === expectedConstants)), 'domain-mismatch', 'cached complete primitive owner binding'); return p; };
  return {encode(p) { return codec.encode(check(p)); }, decode(v) { return check(codec.decode(v)); }};
}
export function algebraicPrimitiveDerivativeCodec<E>(s: AlgebraicDivisorWireContext, primitive: AlgebraicPrimitive<E>): w.EvidenceCodec<AlgebraicPrimitiveDerivative<E>> {
  const {ctx} = s, curve = primitive.curve, native = s.native(curve.owner);
  const term = (t: AlgebraicTraceLogTerm<E>) => { const q = t.quotient, p = w.polynomial(ctx, q.algebra.ring, native);
    return w.structure(ctx, {factors: w.list(ctx, w.structure(ctx, {derivative: s.derivative(q.change.field), conversion: algebraicConstantValueConversionCodec(s, q)})), polynomial: p, trace: w.structure(ctx, {columns: w.list(ctx, p), trace: native})}); };
  const terms: w.EvidenceCodec<readonly AlgebraicTraceLogDerivative<E>[]> = {encode(v) { demand(v.length === primitive.terms.length, 'verification-failed', 'primitive derivative codec full coverage'); return Object.freeze(v.map((p, i) => term(primitive.terms[i]).encode(p))); },
    decode(v) { const entries = w.array(ctx, v); demand(entries.length === primitive.terms.length, 'verification-failed', 'primitive derivative codec full coverage'); return Object.freeze(entries.map((p, i) => term(primitive.terms[i]).decode(p))); }};
  return w.structure(ctx, {field: s.derivative(curve.owner), terms, derivative: native});
}
export interface AlgebraicPrimitiveVerification<E> { readonly primitive: AlgebraicPrimitive<E>; readonly target: E; readonly derivative: AlgebraicPrimitiveDerivative<E> }
export function algebraicPrimitiveVerificationCodec<E>(s: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicPrimitiveVerification<E>> {
  const primitive = algebraicPrimitiveCodec(s, curve), native = s.native(curve.owner);
  return {encode(p) { return Object.freeze({primitive: primitive.encode(p.primitive), target: native.encode(p.target), derivative: algebraicPrimitiveDerivativeCodec(s, p.primitive).encode(p.derivative)}); }, decode(v) {
    const raw = w.record(s.ctx, v, ['primitive', 'target', 'derivative']), p = primitive.decode(raw.primitive), target = native.decode(raw.target), derivative = algebraicPrimitiveDerivativeCodec(s, p).decode(raw.derivative);
    verifyAlgebraicPrimitiveWithin(s.ctx, curve, p, target, derivative, s.bounds); return Object.freeze({primitive: p, target, derivative});
  }};
}
export function encodeAlgebraicPrimitive<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, primitive: AlgebraicPrimitive<E>, target: E, derivative: AlgebraicPrimitiveDerivative<E> & {readonly arithmetic?: AlgebraicPrimitive<E>['arithmetic']}, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => { demand(derivative.arithmetic !== undefined, 'verification-failed', 'primitive codec complete arithmetic coverage');
    return encodeAlgebraicArithmeticArtifact(ctx, curve, {primitive, target, derivative}, 'algebraic-primitive', bounds, derivative.arithmetic,
      () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicPrimitiveWithin(ctx, curve, primitive, target, derivative, bounds); }, s => algebraicPrimitiveVerificationCodec(s, curve)); });
}
export function decodeAlgebraicPrimitive<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, target: E, data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { const d = decodeAlgebraicArithmeticArtifact(ctx, curve, data, 'algebraic-primitive', bounds, s => algebraicPrimitiveVerificationCodec(s, curve));
    demand(curve.owner.equal(ctx, d.value.target, target), 'domain-mismatch', 'primitive codec explicit expected target');
    return Object.freeze({primitive: withAlgebraicPrimitiveArithmeticWithin(ctx, d.value.primitive, d.arithmetic), derivative: Object.freeze({...d.value.derivative, arithmetic: d.arithmetic})}); });
}
