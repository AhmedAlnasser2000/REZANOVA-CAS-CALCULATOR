import { demand, type ExecutionContext } from './execution';
import { checkArtifactBounds, inspectExactArtifact } from './artifact-bounds';
import type { DifferentialBounds, DifferentialElement as E } from './differential-field';
import { factorCoefficientDomain } from './factorization-domain';
import { recursiveFactorizationEvidenceCodec } from './recursive-polynomial-factorization-wire';
import { coefficientSystemCodec } from './recursive-coefficient-system-wire';
import { linearEvidenceCodec } from './linear-wire';
import { normalizationInteger, normalizationText } from './exponential-normalization-wire-values';
import { encodeCertifiedTowerSnapshot, replayCertifiedTowerSnapshot } from './recursive-tower-wire';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';
import { rationalLogarithmicRelationsEvidenceCodec } from './rational-logarithmic-relations-wire';
import { CertifiedTowerView } from './recursive-certified-tower';
import { verifyRecursiveLogarithmicRelationsWithin, type RecursiveLogarithmicRelations } from './recursive-logarithmic-relations';
import type { LogarithmicDescent } from './recursive-logarithmic-descent';
import * as w from './decision-wire-algebra';

function descentCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<LogarithmicDescent> {
  const owner = view.owner, element = factorCoefficientDomain(ctx, owner, bounds.towerHeight).codec(ctx), parent = factorCoefficientDomain(ctx, owner.parent!, bounds.towerHeight).codec(ctx);
  const p = w.polynomial(ctx, owner.fractions!.ring, parent), derivative = w.structure(ctx, {input: element, derivative: element});
  return w.structure(ctx, {
    factorizations: w.list(ctx, recursiveFactorizationEvidenceCodec(ctx, owner.fractions!.ring, bounds)),
    factors: w.list(ctx, w.structure(ctx, {polynomial: p, value: element, derivative, normal: w.bezout(ctx, p), logarithmicDerivative: element})),
    denominator: p, quotients: w.list(ctx, p), divisions: w.list(ctx, w.division(ctx, p)), comparison: coefficientSystemCodec(ctx, owner.parent!, bounds),
    linear: linearEvidenceCodec(ctx, w.scalar(ctx)), lower: w.list(ctx, parent),
  });
}
export function recursiveLogarithmicRelationsEvidenceCodec(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): w.EvidenceCodec<RecursiveLogarithmicRelations> {
  const element = factorCoefficientDomain(ctx, view.owner, bounds.towerHeight).codec(ctx), q = w.scalar(ctx), integer = normalizationInteger(ctx);
  const common = {rule: w.literal(ctx, 'recursive-prime-divisor-logarithmic-relations-v1'), inputs: w.list(ctx, element),
    factors: w.list(ctx, w.structure(ctx, {value: element, derivative: w.structure(ctx, {input: element, derivative: element})})),
    basis: w.list(ctx, w.structure(ctx, {coefficients: w.list(ctx, q), valuations: w.list(ctx, q), index: integer, powers: w.list(ctx, integer)})),
    independence: linearEvidenceCodec(ctx, q), conditions: w.list(ctx, w.structure(ctx, {kind: w.literal(ctx, 'denominator', 'logarithm-argument'), path: normalizationText(ctx), value: element}))};
  if (view.monomial === 'variable') {
    const c = w.structure(ctx, {...common, route: w.literal(ctx, 'rational'), rational: rationalLogarithmicRelationsEvidenceCodec(ctx, view.owner, bounds)});
    return {encode(e) { demand(e.route === 'rational', 'verification-failed', 'logarithmic wire base route'); return c.encode(e); },
      decode(v) { const e = c.decode(v); ctx.allocate(1); return Object.freeze({...e, view}); }};
  }
  const c = w.structure(ctx, {...common, route: w.literal(ctx, 'recursive'), descent: descentCodec(ctx, view, bounds),
    parent: recursiveLogarithmicRelationsEvidenceCodec(ctx, view.parent!, bounds)});
  return {encode(e) { demand(e.route === 'recursive', 'verification-failed', 'logarithmic wire recursive route'); return c.encode(e); },
    decode(v) { const e = c.decode(v); ctx.allocate(1); return Object.freeze({...e, view}); }};
}
export function encodeRecursiveLogarithmicDerivativeRelations(ctx: ExecutionContext, view: CertifiedTowerView, inputs: readonly E[], e: RecursiveLogarithmicRelations, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyRecursiveLogarithmicRelationsWithin(ctx, view, inputs, e, bounds); ctx.allocate(4);
    const payload = packRecursiveArtifactGraph(ctx, {construction: encodeCertifiedTowerSnapshot(ctx, view, bounds), decision: recursiveLogarithmicRelationsEvidenceCodec(ctx, view, bounds).encode(e)}, bounds);
    const data = Object.freeze({tag: 'recursive-logarithmic-derivative-relations', version: 1, payload});
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeRecursiveLogarithmicDerivativeRelations(ctx: ExecutionContext, view: CertifiedTowerView, inputs: readonly E[], data: unknown, bounds: DifferentialBounds): RecursiveLogarithmicRelations {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'payload']);
    demand(raw.tag === 'recursive-logarithmic-derivative-relations' && raw.version === 1, 'invalid-input', 'recursive logarithmic artifact tag/version');
    const expanded = w.record(ctx, unpackRecursiveArtifactGraph(ctx, raw.payload, bounds), ['construction', 'decision']);
    replayCertifiedTowerSnapshot(ctx, view, expanded.construction, bounds);
    const e = recursiveLogarithmicRelationsEvidenceCodec(ctx, view, bounds).decode(expanded.decision); verifyRecursiveLogarithmicRelationsWithin(ctx, view, inputs, e, bounds); return e;
  });
}
