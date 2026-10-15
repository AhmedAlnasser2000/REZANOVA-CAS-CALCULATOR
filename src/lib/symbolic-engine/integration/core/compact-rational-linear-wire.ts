/** Bounded compact rank/kernel replay. Legacy linear transcript codecs remain
 * unchanged; no solver or modular inversion is called while decoding. */
import {demand, type ExecutionContext} from './execution';
import {checkArtifactBounds, inspectExactArtifact, type ExactArtifactBounds} from './artifact-bounds';
import type {Rational} from './rational';
import type {LinearSystem} from './linear-system';
import {linearSystemCodec} from './linear-wire';
import {verifyCompactRationalLinearSystemWithin, type CompactRationalLinearSolution} from './compact-rational-linear';
import * as w from './decision-wire-algebra';

export function compactRationalLinearCodec(ctx: ExecutionContext): w.EvidenceCodec<CompactRationalLinearSolution> {
  const q = w.scalar(ctx), list = w.list(ctx, q), matrix = w.list(ctx, list);
  const common = {method: w.literal(ctx, 'rank-block-kernel'), input: linearSystemCodec(ctx, q), rank: w.integer(ctx), independentRows: w.list(ctx, w.integer(ctx)), pivots: w.list(ctx, w.integer(ctx)), inverse: matrix, nullspace: matrix};
  const yes = w.structure(ctx, {...common, kind: w.literal(ctx, 'consistent'), particular: list}), no = w.structure(ctx, {...common, kind: w.literal(ctx, 'inconsistent'), witness: list});
  return {encode(proof) {return proof.kind === 'consistent' ? yes.encode(proof) : no.encode(proof);}, decode(data) {
    demand(data !== null && typeof data === 'object', 'invalid-input', 'compact linear discriminator'); const descriptor = Object.getOwnPropertyDescriptor(data, 'kind');
    demand(descriptor !== undefined && 'value' in descriptor, 'invalid-input', 'compact linear outcome');
    if (descriptor.value === 'consistent') return yes.decode(data);
    demand(descriptor.value === 'inconsistent', 'invalid-input', 'compact linear outcome'); return no.decode(data);
  }};
}
export function encodeCompactRationalLinearSystem(ctx: ExecutionContext, input: LinearSystem<Rational>, proof: CompactRationalLinearSolution, bounds: ExactArtifactBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyCompactRationalLinearSystemWithin(ctx, input, proof);
    const data = Object.freeze({tag: 'compact-rational-linear-system', version: 1, evidence: compactRationalLinearCodec(ctx).encode(proof)});
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeCompactRationalLinearSystem(ctx: ExecutionContext, input: LinearSystem<Rational>, data: unknown, bounds: ExactArtifactBounds): CompactRationalLinearSolution {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'evidence']); demand(raw.tag === 'compact-rational-linear-system' && raw.version === 1, 'invalid-input', 'compact linear tag/version');
    const proof = compactRationalLinearCodec(ctx).decode(raw.evidence); verifyCompactRationalLinearSystemWithin(ctx, input, proof); return proof;
  });
}
