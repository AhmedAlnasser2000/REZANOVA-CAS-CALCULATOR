/** Compact positive format. Full version-one rational replay stays unchanged. */
import {demand, type ExecutionContext} from './execution';
import type {FormalPrimitiveDomain, QRationalFunction} from './formal-primitive';
import type {ExactArtifactBounds} from './artifact-bounds';
import {checkArtifactBounds, inspectExactArtifact} from './artifact-bounds';
import {encodePrimitiveWithin, decodePrimitiveInDomain} from './primitive-wire';
import {rationalPrimitiveDerivativeCodec} from './rational-primitive-evidence-codecs';
import {compactRationalElementaryRule, verifyCompactRationalElementaryWithin, type CompactRationalElementary} from './rational-elementary-evidence';
import {packAlgebraicArtifactData, unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as w from './decision-wire-algebra';

function codecs(ctx: ExecutionContext, owner: FormalPrimitiveDomain) {
  const q = w.scalar(ctx), x = w.polynomial(ctx, owner.x, q), f = w.fraction(ctx, owner.fractions, q);
  const norms = w.list(ctx, w.prsEvidence(ctx, w.polynomial(ctx, owner.elimination, x), x));
  const common = w.structure(ctx, {kind: w.literal(ctx, 'elementary'), rule: w.literal(ctx, compactRationalElementaryRule), input: f,
    conditions: w.structure(ctx, {inputDenominator: x, rationalDenominator: x, logNorms: w.list(ctx, x)})});
  return {norms, common};
}
export function encodeCompactRationalElementaryWithin(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, proof: CompactRationalElementary, bounds: ExactArtifactBounds): unknown {
  checkArtifactBounds(ctx, bounds); verifyCompactRationalElementaryWithin(ctx, owner, input, proof); const c = codecs(ctx, owner); ctx.allocate(proof.primitive.terms.length + 5);
  const payload = packAlgebraicArtifactData(ctx, Object.freeze({primitive: encodePrimitiveWithin(ctx, proof.primitive), norms: c.norms.encode(proof.primitive.terms.map(t => t.normEvidence)),
    derivative: rationalPrimitiveDerivativeCodec(ctx, owner, proof.primitive).encode(proof.derivative), evidence: c.common.encode(proof)}), bounds);
  const data = Object.freeze({kind: 'rational-integration-decision', version: 2, variable: owner.x.variable, residueVariable: owner.z.variable, payload}); inspectExactArtifact(ctx, bounds, data); return data;
}
export function decodeCompactRationalElementaryWithin(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, data: unknown, bounds: ExactArtifactBounds): CompactRationalElementary {
  checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data); owner.fractions.assert(ctx, input);
  const raw = w.record(ctx, data, ['kind', 'version', 'variable', 'residueVariable', 'payload']);
  demand(raw.kind === 'rational-integration-decision' && raw.version === 2 && raw.variable === owner.x.variable && raw.residueVariable === owner.z.variable, 'domain-mismatch', 'compact rational format/variables');
  const body = w.record(ctx, unpackAlgebraicArtifactData(ctx, raw.payload, bounds), ['primitive', 'norms', 'derivative', 'evidence']), c = codecs(ctx, owner);
  const norms = c.norms.decode(body.norms), primitive = decodePrimitiveInDomain(ctx, owner, body.primitive, norms), derivative = rationalPrimitiveDerivativeCodec(ctx, owner, primitive).decode(body.derivative);
  const proof = Object.freeze({...c.common.decode(body.evidence), primitive, derivative}); verifyCompactRationalElementaryWithin(ctx, owner, input, proof); return proof;
}
export function encodeCompactRationalElementary(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, proof: CompactRationalElementary, bounds: ExactArtifactBounds): unknown {
  return ctx.operation(() => encodeCompactRationalElementaryWithin(ctx, owner, input, proof, bounds));
}
export function decodeCompactRationalElementary(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, data: unknown, bounds: ExactArtifactBounds): CompactRationalElementary {
  return ctx.operation(() => decodeCompactRationalElementaryWithin(ctx, owner, input, data, bounds));
}
