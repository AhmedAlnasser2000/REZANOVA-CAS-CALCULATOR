import { demand, type ExecutionContext } from './execution';
import { checkArtifactBounds, inspectExactArtifact } from './artifact-bounds';
import type { DifferentialField, DifferentialElement as E, DifferentialBounds } from './differential-field';
import { factorCoefficientDomain } from './factorization-domain';
import { recursiveFactorizationEvidenceCodec } from './recursive-polynomial-factorization-wire';
import { coefficientSystemCodec } from './recursive-coefficient-system-wire';
import { linearEvidenceCodec } from './linear-wire';
import { normalizationInteger } from './exponential-normalization-wire-values';
import { verifyRationalLogarithmicRelationsWithin, type RationalLogarithmicRelations } from './rational-logarithmic-relations';
import * as w from './decision-wire-algebra';

export function rationalLogarithmicRelationsEvidenceCodec(ctx: ExecutionContext, owner: DifferentialField, bounds: DifferentialBounds): w.EvidenceCodec<RationalLogarithmicRelations> {
  const element = factorCoefficientDomain(ctx, owner, bounds.towerHeight).codec(ctx);
  const coefficient = factorCoefficientDomain(ctx, owner.parent!, 0).codec(ctx), ring = owner.fractions!.ring;
  const p = w.polynomial(ctx, ring, coefficient), q = w.scalar(ctx), integer = normalizationInteger(ctx);
  return w.structure(ctx, {
    rule: w.literal(ctx, 'rational-prime-divisor-logarithmic-relations-v1'), inputs: w.list(ctx, element),
    factorizations: w.list(ctx, recursiveFactorizationEvidenceCodec(ctx, ring, bounds)),
    factors: w.list(ctx, w.structure(ctx, {polynomial: p, value: element, derivative: w.structure(ctx, {input: element, derivative: element}), logarithmicDerivative: element})),
    comparison: coefficientSystemCodec(ctx, owner, bounds), linear: linearEvidenceCodec(ctx, q), independence: linearEvidenceCodec(ctx, q),
    basis: w.list(ctx, w.structure(ctx, {coefficients: w.list(ctx, q), valuations: w.list(ctx, q), index: integer, powers: w.list(ctx, integer)})),
    conditions: w.list(ctx, p),
  });
}
export function encodeRationalLogarithmicRelations(ctx: ExecutionContext, owner: DifferentialField, inputs: readonly E[], e: RationalLogarithmicRelations, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyRationalLogarithmicRelationsWithin(ctx, owner, inputs, e, bounds); ctx.allocate(3);
    const data = Object.freeze({tag: 'rational-logarithmic-derivative-relations', version: 1, decision: rationalLogarithmicRelationsEvidenceCodec(ctx, owner, bounds).encode(e)});
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeRationalLogarithmicRelations(ctx: ExecutionContext, owner: DifferentialField, inputs: readonly E[], data: unknown, bounds: DifferentialBounds): RationalLogarithmicRelations {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'decision']);
    demand(raw.tag === 'rational-logarithmic-derivative-relations' && raw.version === 1, 'invalid-input', 'rational logarithmic artifact tag/version');
    const e = rationalLogarithmicRelationsEvidenceCodec(ctx, owner, bounds).decode(raw.decision);
    verifyRationalLogarithmicRelationsWithin(ctx, owner, inputs, e, bounds); return e;
  });
}
