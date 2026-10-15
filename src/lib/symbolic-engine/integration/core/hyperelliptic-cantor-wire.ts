/** Complete cold Cantor replay, distinct from legacy RR/torsion evidence. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicDivisorCodec} from './algebraic-divisor-wire';
import {bindExpectedAlgebraicPlace} from './algebraic-place-wire';
import {verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {reconstructRamifiedHyperellipticModelWithin, type RamifiedHyperellipticModel} from './ramified-hyperelliptic-model';
import {cantorArithmeticEvidenceCodecs} from './cantor-wire-algebra';
import type {CantorDivisorClass} from './hyperelliptic-cantor-divisor';
import {cantorPrincipalityRule, verifyCantorPrincipalityWithin, type CantorPrincipality} from './hyperelliptic-cantor-principality';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {inspectExactArtifact} from './artifact-bounds';
import * as w from './decision-wire-algebra';

export function ramifiedHyperellipticModelCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<RamifiedHyperellipticModel<E>> {
  const ctx = s.ctx, p = w.polynomial(ctx, curve.coordinates.scalar.ring, s.coefficient(curve.coordinates.scalar)), n = s.native(curve.owner), scalar = s.scalar(curve.coordinates.scalar);
  const parts = w.structure(ctx, {b: scalar, c: scalar, polynomial: p, squareFree: w.bezout(ctx, p), x: n, y: n, inverseGenerator: n});
  return {encode(value) {demand(value.curve === curve, 'domain-mismatch', 'ramified model codec owner'); return parts.encode(value);},
    decode(data) {return reconstructRamifiedHyperellipticModelWithin(ctx, curve, parts.decode(data), s.bounds);}};
}
export function cantorArithmeticCodecs<E>(s: NormalizedAlgebraicWireContext, model: RamifiedHyperellipticModel<E>) {
  const ctx = s.ctx, p = w.polynomial(ctx, model.domain.ring, s.coefficient(model.curve.coordinates.scalar));
  return cantorArithmeticEvidenceCodecs(ctx, p, s.integer(), (name, codec) => s.memo(name, model, codec));
}
export function cantorDivisorClassCodec<E>(s: NormalizedAlgebraicWireContext, model: RamifiedHyperellipticModel<E>, expected: AlgebraicDivisor<E>): w.EvidenceCodec<CantorDivisorClass<E>> {
  const ctx = s.ctx, {pair, reduction, addition, multiple} = cantorArithmeticCodecs(s, model), native = s.native(model.curve.owner);
  const parts = w.structure(ctx, {additions: w.list(ctx, addition), pair, factors: w.list(ctx, w.structure(ctx, {value: native, exponent: s.integer()})), conditions: s.conditions(model.curve.owner)});
  const termParts = (index: number) => {
    demand(index < expected.entries.length, 'verification-failed', 'Cantor indexed place coverage'); const place = expected.entries[index].place;
    return w.structure(ctx, {kind: w.literal(ctx, 'infinity', 'inert', 'split'), yResidue: w.optional(s.native(place.residue)), initial: pair,
      reductions: w.list(ctx, reduction), pair, principalFactor: w.optional(native), multiple});
  };
  return {
    encode(value) {demand(value.model === model && value.divisor === expected && value.terms.length === expected.entries.length, 'domain-mismatch', 'Cantor codec exact request');
      ctx.allocate(value.terms.length); return Object.freeze({terms: Object.freeze(value.terms.map((term, i) => termParts(i).encode({...term.transport, multiple: term.multiple}))), evidence: parts.encode(value)});},
    decode(data) {const raw = w.record(ctx, data, ['terms', 'evidence']), values = w.array(ctx, raw.terms);
      demand(values.length === expected.entries.length, 'verification-failed', 'complete Cantor saved place coverage'); ctx.allocate(values.length);
      const terms = Object.freeze(values.map((data, i) => {const value = termParts(i).decode(data), {multiple, ...transport} = value; ctx.allocate(2);
        return Object.freeze({transport: Object.freeze({place: expected.entries[i].place, ...transport}), multiple});}));
      ctx.allocate(4); return Object.freeze({model, divisor: expected, terms, ...parts.decode(raw.evidence)});}
  };
}
export function cantorPrincipalityCodec<E>(s: NormalizedAlgebraicWireContext, model: RamifiedHyperellipticModel<E>, expected: AlgebraicDivisor<E>): w.EvidenceCodec<CantorPrincipality<E>> {
  const parts = w.structure(s.ctx, {rule: w.literal(s.ctx, cantorPrincipalityRule), kind: w.literal(s.ctx, 'principal', 'not-principal'), reduction: w.optional(cantorDivisorClassCodec(s, model, expected))});
  return {encode(value) {return parts.encode(value);}, decode(data) {const proof = Object.freeze({model, divisor: expected, ...parts.decode(data)});
    verifyCantorPrincipalityWithin(s.ctx, model, expected, proof, s.bounds); return proof;}};
}
export function encodeCantorPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, expected: AlgebraicDivisor<E>, proof: CantorPrincipality<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    demand(proof.model.curve === curve, 'domain-mismatch', 'Cantor encoding curve'); verifyCantorPrincipalityWithin(ctx, proof.model, expected, proof, bounds);
    const s = new NormalizedAlgebraicWireContext(ctx, bounds), payload = packAlgebraicArtifactData(ctx, Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve),
      request: algebraicDivisorCodec(s, curve).encode(expected), model: ramifiedHyperellipticModelCodec(s, curve).encode(proof.model), evidence: cantorPrincipalityCodec(s, proof.model, expected).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'algebraic-principality', version: 2, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeCantorPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, expected: AlgebraicDivisor<E>, data: unknown, bounds: DifferentialBounds): CantorPrincipality<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'algebraic-principality' && raw.version === 2, 'invalid-input', 'Cantor principality tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'request', 'model', 'evidence']), s = new NormalizedAlgebraicWireContext(ctx, bounds);
    algebraicCurveEvidenceCodec(s, curve).decode(body.curve); const request = algebraicDivisorCodec(s, curve).decode(body.request);
    verifyAlgebraicDivisorWithin(ctx, curve, expected.input, request);
    for (let i = 0; i < expected.entries.length; i++) bindExpectedAlgebraicPlace(s, curve, expected.entries[i].place, request.entries[i].place);
    const model = ramifiedHyperellipticModelCodec(s, curve).decode(body.model); return cantorPrincipalityCodec(s, model, expected).decode(body.evidence);
  });
}
