import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing} from './polynomial';
import type {AlgebraicCurveView} from './algebraic-curve';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {algebraicDivisorCodec} from './algebraic-divisor-wire';
import {bindExpectedAlgebraicPlace} from './algebraic-place-wire';
import {verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {reconstructEllipticCurveModelWithin, type EllipticCurveModel} from './elliptic-curve-model';
import {ellipticInfinity, ellipticPoint, assertEllipticPoint, type EllipticPoint, type EllipticAddition, type EllipticMultiple} from './elliptic-group';
import type {EllipticDivisorClass} from './elliptic-miller';
import type {EllipticArithmeticModel} from './elliptic-arithmetic-model';
import {ellipticTorsionRule, verifyEllipticDivisorTorsionWithin, type EllipticDivisorTorsion} from './elliptic-divisor-torsion';
import {inspectExactArtifact} from './artifact-bounds';
import {normalizationText} from './exponential-normalization-wire-values';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as w from './decision-wire-algebra';

function modelCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<EllipticCurveModel<E>> {
  const ctx = s.ctx, native = s.native(curve.owner), scalar = s.scalar(curve.coordinates.scalar), constant = s.coefficient(curve.coordinates.scalar);
  const original = w.polynomial(ctx, curve.coordinates.scalar.ring, constant);
  const parts = (ring: PolynomialRing<import('./algebraic-curve-coordinates').CurveConstant>) => w.structure(ctx, {b: scalar, c: scalar, square: scalar,
    squareFree: w.bezout(ctx, original), leading: constant, polynomial: w.polynomial(ctx, ring, constant), x: native, y: native, inverseGenerator: native});
  return {encode(v) {demand(v.curve === curve, 'domain-mismatch', 'elliptic model codec owner'); return parts(v.polynomial.ring).encode(v);},
    decode(data) {const ring = new PolynomialRing(curve.coordinates.constantOwner, 'X'); return reconstructEllipticCurveModelWithin(ctx, curve, parts(ring).decode(data), s.bounds);}};
}
export function pointCodec<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(s: NormalizedAlgebraicWireContext, model: M & EllipticArithmeticModel<E>): w.EvidenceCodec<EllipticPoint<E, M>> {
  const ctx = s.ctx, constant = s.coefficient(model.curve.coordinates.scalar), infinity = w.structure(ctx, {kind: w.literal(ctx, 'infinity')}), affine = w.structure(ctx, {kind: w.literal(ctx, 'affine'), x: constant, y: constant});
  return s.memo('elliptic-point', model, {encode(value) {assertEllipticPoint(ctx, model, value); return value.kind === 'infinity' ? infinity.encode(value) : affine.encode(value);},
    decode(data) {demand(data !== null && typeof data === 'object', 'invalid-input', 'elliptic point record'); const kind = Object.getOwnPropertyDescriptor(data, 'kind'); demand(kind !== undefined && 'value' in kind, 'invalid-input', 'elliptic point kind');
      if (kind.value === 'infinity') {infinity.decode(data); return ellipticInfinity(ctx, model);} const value = affine.decode(data); return ellipticPoint(ctx, model, value.x, value.y);}});
}
export function additionCodec<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(s: NormalizedAlgebraicWireContext, model: M & EllipticArithmeticModel<E>): w.EvidenceCodec<EllipticAddition<E, M>> {
  const p = pointCodec(s, model), c = s.coefficient(model.curve.coordinates.scalar), n = s.native(model.curve.owner);
  return s.memo('elliptic-addition', model, w.structure(s.ctx, {left: p, right: p, sum: p, kind: w.literal(s.ctx, 'left-identity', 'right-identity', 'vertical', 'chord', 'tangent'), slope: w.optional(c), intercept: w.optional(c), line: w.optional(n), vertical: w.optional(n)}));
}
export function multipleCodec<E, M extends EllipticArithmeticModel<E> = EllipticCurveModel<E>>(s: NormalizedAlgebraicWireContext, model: M & EllipticArithmeticModel<E>): w.EvidenceCodec<EllipticMultiple<E, M>> {
  const p = pointCodec(s, model), add = additionCodec(s, model);
  return s.memo('elliptic-multiple', model, w.structure(s.ctx, {input: p, coefficient: s.integer(), base: p, adjustment: w.optional(add), steps: w.list(s.ctx, w.structure(s.ctx, {double: add, add: w.optional(add)})), point: p}));
}
function evidenceCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, expected: AlgebraicDivisor<E>, model: EllipticCurveModel<E>): w.EvidenceCodec<EllipticDivisorTorsion<E>> {
  const ctx = s.ctx, point = pointCodec(s, model), multiple = multipleCodec(s, model), addition = additionCodec(s, model), native = s.native(curve.owner);
  const factors = w.list(ctx, w.structure(ctx, {value: native, exponent: s.integer()}));
  const conditions = w.list(ctx, w.structure(ctx, {kind: w.literal(ctx, 'denominator', 'nonzero'), path: normalizationText(ctx), value: native}));
  const terms: w.EvidenceCodec<EllipticDivisorClass<E>['terms'][number]> = {
    encode(value) {
      const place = value.transport.place;
      return w.structure(ctx, {point, xResidue: w.optional(s.native(place.residue)), yResidue: w.optional(s.native(place.residue)), multiple}).encode({...value.transport, multiple: value.multiple});
    },
    decode() {demand(false, 'invalid-input', 'expected indexed elliptic place required');}
  };
  const other = w.structure(ctx, {additions: w.list(ctx, addition), point, factors, conditions});
  return {
    encode(value) {
      return Object.freeze({rule: ellipticTorsionRule, reduction: Object.freeze({terms: w.list(ctx, terms).encode(value.reduction.terms), evidence: other.encode(value.reduction)}),
        tests: w.list(ctx, multiple).encode(value.tests), kind: value.kind, order: w.optional(s.integer()).encode(value.order), factors: factors.encode(value.factors), conditions: conditions.encode(value.conditions)});
    },
    decode(data) {
      const raw = w.record(ctx, data, ['rule', 'reduction', 'tests', 'kind', 'order', 'factors', 'conditions']); demand(raw.rule === ellipticTorsionRule, 'invalid-input', 'elliptic decision rule');
      const reduction = w.record(ctx, raw.reduction, ['terms', 'evidence']), values = w.array(ctx, reduction.terms);
      demand(values.length === expected.entries.length, 'verification-failed', 'elliptic serialized place coverage'); ctx.allocate(values.length);
      const decodedTerms = Object.freeze(values.map((data, i) => {
        const place = expected.entries[i].place, parts = w.structure(ctx, {point, xResidue: w.optional(s.native(place.residue)), yResidue: w.optional(s.native(place.residue)), multiple}).decode(data);
        return Object.freeze({transport: Object.freeze({place, point: parts.point, xResidue: parts.xResidue, yResidue: parts.yResidue}), multiple: parts.multiple});
      }));
      const prefix = Object.freeze({model, divisor: expected, terms: decodedTerms, ...other.decode(reduction.evidence)});
      const value = Object.freeze({rule: ellipticTorsionRule, model, divisor: expected, reduction: prefix, tests: w.list(ctx, multiple).decode(raw.tests), kind: w.literal(ctx, 'torsion', 'non-torsion').decode(raw.kind), order: w.optional(s.integer()).decode(raw.order), factors: factors.decode(raw.factors), conditions: conditions.decode(raw.conditions)});
      verifyEllipticDivisorTorsionWithin(ctx, curve, expected, value, s.bounds); return value;
    }
  };
}
/** Composition without a nested operation. Standalone data remains unchanged. */
export function ellipticPrincipalMultipleCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>, expected: AlgebraicDivisor<E>): w.EvidenceCodec<EllipticDivisorTorsion<E>> {
  const model = modelCodec(s, curve);
  return {encode(p) {return Object.freeze({model: model.encode(p.model), evidence: evidenceCodec(s, curve, expected, p.model).encode(p)});},
    decode(data) {const raw = w.record(s.ctx, data, ['model', 'evidence']), presentation = model.decode(raw.model); return evidenceCodec(s, curve, expected, presentation).decode(raw.evidence);}};
}
export function encodeEllipticDivisorTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, expected: AlgebraicDivisor<E>, proof: EllipticDivisorTorsion<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyEllipticDivisorTorsionWithin(ctx, curve, expected, proof, bounds); const s = new NormalizedAlgebraicWireContext(ctx, bounds);
    const payload = packAlgebraicArtifactData(ctx, Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), request: algebraicDivisorCodec(s, curve).encode(expected),
      model: modelCodec(s, curve).encode(proof.model), evidence: evidenceCodec(s, curve, expected, proof.model).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'algebraic-divisor-torsion', version: 2, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeEllipticDivisorTorsion<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, expected: AlgebraicDivisor<E>, data: unknown, bounds: DifferentialBounds): EllipticDivisorTorsion<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'algebraic-divisor-torsion' && raw.version === 2, 'invalid-input', 'elliptic compact tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'request', 'model', 'evidence']), s = new NormalizedAlgebraicWireContext(ctx, bounds);
    algebraicCurveEvidenceCodec(s, curve).decode(body.curve); const request = algebraicDivisorCodec(s, curve).decode(body.request);
    verifyAlgebraicDivisorWithin(ctx, curve, expected.input, request);
    for (let i = 0; i < expected.entries.length; i++) bindExpectedAlgebraicPlace(s, curve, expected.entries[i].place, request.entries[i].place);
    const model = modelCodec(s, curve).decode(body.model); return evidenceCodec(s, curve, expected, model).decode(body.evidence);
  });
}
