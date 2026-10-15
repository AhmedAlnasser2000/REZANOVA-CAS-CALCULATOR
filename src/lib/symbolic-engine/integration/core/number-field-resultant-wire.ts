/** Explicit expected-owner scalar-resultant replay, with complete construction
 * binding. Indexed Brown evidence retains its original separate codecs. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {checkDifferentialBounds} from './differential-field';
import type {Polynomial, PolynomialRing} from './polynomial';
import {inspectExactArtifact} from './artifact-bounds';
import {encodeAlgebraicSnapshot, verifyAlgebraicSnapshot} from './algebraic-wire';
import {algebraicNormalizedValueCodec} from './algebraic-normalized-wire';
import {verifyNumberFieldModularResultantWithin, type NumberFieldModularResultant} from './number-field-modular-resultant';
import * as w from './decision-wire-algebra';

export function numberFieldResultantCodec<E>(ctx: ExecutionContext, r: PolynomialRing<E>, bounds: DifferentialBounds): w.EvidenceCodec<NumberFieldModularResultant<E>> {
  const coefficient = algebraicNormalizedValueCodec(ctx, r.domain, bounds), p = w.polynomial(ctx, r, coefficient), common = {inputA: p, inputB: p, resultant: coefficient};
  const boundary = w.structure(ctx, {...common, method: w.literal(ctx, 'boundary')}), zero = w.structure(ctx, {...common, method: w.literal(ctx, 'common-factor'), factor: p, quotientA: p, quotientB: p});
  const nonzero = w.structure(ctx, {...common, method: w.literal(ctx, 'modular-lu'), permutation: w.list(ctx, w.integer(ctx)), lower: w.list(ctx, w.list(ctx, coefficient)), upper: w.list(ctx, w.list(ctx, coefficient)), inverses: w.list(ctx, coefficient)});
  return {encode(proof) {return proof.method === 'boundary' ? boundary.encode(proof) : proof.method === 'common-factor' ? zero.encode(proof) : nonzero.encode(proof);}, decode(data) {
    demand(data !== null && typeof data === 'object', 'invalid-input', 'resultant discriminator'); const descriptor = Object.getOwnPropertyDescriptor(data, 'method');
    demand(descriptor !== undefined && 'value' in descriptor, 'invalid-input', 'resultant evidence method');
    if (descriptor.value === 'boundary') return boundary.decode(data); if (descriptor.value === 'common-factor') return zero.decode(data);
    demand(descriptor.value === 'modular-lu', 'invalid-input', 'resultant evidence method'); return nonzero.decode(data);
  }};
}
export function encodeNumberFieldModularResultant<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, proof: NumberFieldModularResultant<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); verifyNumberFieldModularResultantWithin(ctx, r, a, b, proof, bounds);
    const data = Object.freeze({tag: 'number-field-modular-resultant', version: 1, construction: encodeAlgebraicSnapshot(ctx, r.domain, bounds), evidence: numberFieldResultantCodec(ctx, r, bounds).encode(proof)});
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeNumberFieldModularResultant<E>(ctx: ExecutionContext, r: PolynomialRing<E>, a: Polynomial<E>, b: Polynomial<E>, data: unknown, bounds: DifferentialBounds): NumberFieldModularResultant<E> {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'construction', 'evidence']);
    demand(raw.tag === 'number-field-modular-resultant' && raw.version === 1, 'invalid-input', 'resultant tag/version'); verifyAlgebraicSnapshot(ctx, r.domain, raw.construction, bounds);
    const proof = numberFieldResultantCodec(ctx, r, bounds).decode(raw.evidence); verifyNumberFieldModularResultantWithin(ctx, r, a, b, proof, bounds); return proof;
  });
}
