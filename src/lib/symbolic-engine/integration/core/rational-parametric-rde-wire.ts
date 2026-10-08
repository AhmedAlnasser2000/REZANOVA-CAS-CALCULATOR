import { demand, type ExecutionContext } from './execution';
import { checkArtifactBounds, inspectExactArtifact, type ExactArtifactBounds } from './artifact-bounds';
import type { DifferentialField, DifferentialElement as E } from './differential-field';
import { rdeDomain, type RdeDomain } from './rde-algebra';
import { rationalRdeEvidenceCodecs } from './rde-wire-evidence';
import { linearEvidenceCodec, linearSystemCodec } from './linear-wire';
import { verifyRationalParametricRdeWithin, type RationalParametricRdeDecision } from './rational-parametric-rde';
import * as w from './decision-wire-algebra';

export function rationalParametricRdeEvidenceCodec(ctx: ExecutionContext, d: RdeDomain): w.EvidenceCodec<Omit<RationalParametricRdeDecision, 'domain'>> {
  const {element, p, bezout, triple, denominator, degree, derivative} = rationalRdeEvidenceCodecs(ctx, d), scalar = w.scalar(ctx);
  const pair = w.structure(ctx, {coefficients: w.list(ctx, scalar), value: element, derivative});
  return w.structure(ctx, {
    kind: w.literal(ctx, 'solutions', 'no-field-solution'), rule: w.literal(ctx, 'rational-parametric-rde-bounds-v1'),
    a: element, b: element, forcing: w.list(ctx, element),
    clearing: w.structure(ctx, {steps: w.list(ctx, bezout), denominator: p, quotients: w.list(ctx, p), A: p, B: p, C: w.list(ctx, p)}),
    denominator, polynomial: w.structure(ctx, {A: p, B: p, C: w.list(ctx, p), largest: w.integer(ctx), degreeEquation: triple, degree}),
    system: linearSystemCodec(ctx, scalar), linear: linearEvidenceCodec(ctx, scalar),
    family: w.optional(w.structure(ctx, {particular: pair, directions: w.list(ctx, pair)})),
    conditions: w.structure(ctx, {inputs: w.list(ctx, p), representatives: w.list(ctx, p)}),
  });
}
/** Lower-field artifact used by recursive composition; complete verification is mandatory. */
export function encodeRationalParametricRde(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E, forcing: readonly E[], e: RationalParametricRdeDecision, bounds: ExactArtifactBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyRationalParametricRdeWithin(ctx, owner, a, b, forcing, e); ctx.allocate(3);
    const data = Object.freeze({tag: 'rational-parametric-rde-decision', version: 1, decision: rationalParametricRdeEvidenceCodec(ctx, e.domain).encode(e)});
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeRationalParametricRde(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E, forcing: readonly E[], data: unknown, bounds: ExactArtifactBounds): RationalParametricRdeDecision {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'decision']);
    demand(raw.tag === 'rational-parametric-rde-decision' && raw.version === 1, 'invalid-input', 'parametric RDE artifact tag/version');
    const domain = rdeDomain(ctx, owner), decoded = rationalParametricRdeEvidenceCodec(ctx, domain).decode(raw.decision); ctx.allocate(17);
    const e = Object.freeze({...decoded, domain}); verifyRationalParametricRdeWithin(ctx, owner, a, b, forcing, e); return e;
  });
}
