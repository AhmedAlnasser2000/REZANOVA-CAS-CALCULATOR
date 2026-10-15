/** Complete native balanced principality, separate from RR and odd formats. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicDivisorCodec} from './algebraic-divisor-wire';
import {bindExpectedAlgebraicPlace} from './algebraic-place-wire';
import {verifyAlgebraicDivisorWithin, type AlgebraicDivisor} from './algebraic-divisor';
import {NormalizedAlgebraicWireContext} from './algebraic-normalized-wire';
import {hyperellipticModelCodec} from './hyperelliptic-pell-wire';
import {reconstructBalancedDomainWithin} from './hyperelliptic-balanced';
import {verifyBalancedCurveModelWithin, type BalancedCurveModel} from './hyperelliptic-balanced-place';
import {balancedArithmeticEvidenceCodecs} from './balanced-cantor-wire-algebra';
import {balancedPrincipalityRule, verifyBalancedPrincipalityWithin, type BalancedPrincipality, type BalancedDivisorClass} from './hyperelliptic-balanced-divisor';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {inspectExactArtifact} from './artifact-bounds';
import * as w from './decision-wire-algebra';

export function balancedCurveModelCodec<E>(s: NormalizedAlgebraicWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<BalancedCurveModel<E>> {
  const ctx = s.ctx, p = w.polynomial(ctx, curve.coordinates.scalar.ring, s.coefficient(curve.coordinates.scalar));
  const parts = w.structure(ctx, {model: hyperellipticModelCodec(s, curve), squareFree: w.bezout(ctx, p), plus: p, minus: p, infinityRemainder: p});
  return {encode(value) {return parts.encode({model: value.model, ...value.domain});}, decode(data) {
    const value = parts.decode(data), {model, squareFree, ...infinity} = value, domain = reconstructBalancedDomainWithin(ctx, model.polynomial.ring, model.polynomial, squareFree, Object.freeze(infinity), s.bounds);
    ctx.allocate(2); const proof = Object.freeze({model, domain}); verifyBalancedCurveModelWithin(ctx, model, proof, s.bounds); return proof;
  }};
}
export function balancedDivisorClassCodec<E>(s: NormalizedAlgebraicWireContext, source: BalancedCurveModel<E>, expected: AlgebraicDivisor<E>): w.EvidenceCodec<BalancedDivisorClass<E>> {
  const ctx = s.ctx, domain = source.domain, p = w.polynomial(ctx, domain.ring, s.coefficient(source.model.curve.coordinates.scalar));
  const {divisor, normalization, addition, multiple} = balancedArithmeticEvidenceCodecs(ctx, p, s.integer(), (name, codec) => s.memo(name, source, codec)), native = s.native(source.model.curve.owner);
  const parts = w.structure(ctx, {additions: w.list(ctx, addition), result: divisor, factors: w.list(ctx, w.structure(ctx, {value: native, exponent: s.integer()})), conditions: s.conditions(source.model.curve.owner)});
  const termParts = (index: number) => {
    demand(index < expected.entries.length, 'verification-failed', 'balanced indexed place coverage'); const place = expected.entries[index].place;
    return w.structure(ctx, {kind: w.literal(ctx, 'infinity-plus', 'infinity-minus', 'inert', 'split'), yResidue: w.optional(s.native(place.residue)), normalization, result: divisor, principalFactor: w.optional(native), multiple});
  };
  return {encode(value) {
    demand(value.source === source && value.divisor === expected && value.terms.length === expected.entries.length, 'domain-mismatch', 'balanced codec exact request'); ctx.allocate(value.terms.length);
    return Object.freeze({terms: Object.freeze(value.terms.map((term, i) => termParts(i).encode({...term.transport, multiple: term.multiple}))), evidence: parts.encode(value)});
  }, decode(data) {
    const raw = w.record(ctx, data, ['terms', 'evidence']), values = w.array(ctx, raw.terms); demand(values.length === expected.entries.length, 'verification-failed', 'complete balanced saved place coverage'); ctx.allocate(values.length);
    const terms = Object.freeze(values.map((data, i) => {const {multiple, ...transport} = termParts(i).decode(data); ctx.allocate(2); return Object.freeze({transport: Object.freeze({place: expected.entries[i].place, ...transport}), multiple});}));
    ctx.allocate(4); return Object.freeze({source, divisor: expected, terms, ...parts.decode(raw.evidence)});
  }};
}
export function balancedPrincipalityCodec<E>(s: NormalizedAlgebraicWireContext, source: BalancedCurveModel<E>, expected: AlgebraicDivisor<E>): w.EvidenceCodec<BalancedPrincipality<E>> {
  const parts = w.structure(s.ctx, {rule: w.literal(s.ctx, balancedPrincipalityRule), kind: w.literal(s.ctx, 'principal', 'not-principal'), reduction: w.optional(balancedDivisorClassCodec(s, source, expected))});
  return {encode(value) {return parts.encode(value);}, decode(data) {const proof = Object.freeze({source, divisor: expected, ...parts.decode(data)}); verifyBalancedPrincipalityWithin(s.ctx, source, expected, proof, s.bounds); return proof;}};
}
export function encodeBalancedPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, expected: AlgebraicDivisor<E>, proof: BalancedPrincipality<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    demand(proof.source.model.curve === curve, 'domain-mismatch', 'balanced encoding curve'); verifyBalancedPrincipalityWithin(ctx, proof.source, expected, proof, bounds);
    const s = new NormalizedAlgebraicWireContext(ctx, bounds), payload = packAlgebraicArtifactData(ctx, Object.freeze({curve: algebraicCurveEvidenceCodec(s, curve).encode(curve), request: algebraicDivisorCodec(s, curve).encode(expected),
      source: balancedCurveModelCodec(s, curve).encode(proof.source), evidence: balancedPrincipalityCodec(s, proof.source, expected).encode(proof)}), bounds);
    const data = Object.freeze({tag: 'hyperelliptic-balanced-principality', version: 1, payload}); inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeBalancedPrincipality<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, expected: AlgebraicDivisor<E>, data: unknown, bounds: DifferentialBounds): BalancedPrincipality<E> {
  return ctx.operation(() => {
    inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'payload']); demand(raw.tag === 'hyperelliptic-balanced-principality' && raw.version === 1, 'invalid-input', 'balanced principality tag/version');
    const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['curve', 'request', 'source', 'evidence']), s = new NormalizedAlgebraicWireContext(ctx, bounds); algebraicCurveEvidenceCodec(s, curve).decode(body.curve);
    const request = algebraicDivisorCodec(s, curve).decode(body.request); verifyAlgebraicDivisorWithin(ctx, curve, expected.input, request);
    for (let i = 0; i < expected.entries.length; i++) bindExpectedAlgebraicPlace(s, curve, expected.entries[i].place, request.entries[i].place);
    const source = balancedCurveModelCodec(s, curve).decode(body.source); return balancedPrincipalityCodec(s, source, expected).decode(body.evidence);
  });
}
