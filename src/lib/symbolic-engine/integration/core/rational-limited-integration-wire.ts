import { demand, type ExecutionContext } from './execution';
import { checkArtifactBounds, inspectExactArtifact, type ExactArtifactBounds } from './artifact-bounds';
import type { DifferentialField, DifferentialElement as E } from './differential-field';
import type { FormalPrimitiveDomain } from './formal-primitive';
import { toRationalPrimitiveInput, fromRationalPrimitiveInput } from './exponential-sum-bridge';
import { hermiteEvidenceCodec } from './hermite-wire';
import { linearEvidenceCodec } from './linear-wire';
import * as w from './decision-wire-algebra';
import { limitedIntegrationDomain, limitedIntegrationRule, verifyRationalLimitedIntegration, type RationalLimitedIntegrationDecision } from './rational-limited-integration';

function codec(ctx: ExecutionContext, owner: DifferentialField, domain: FormalPrimitiveDomain): w.EvidenceCodec<Omit<RationalLimitedIntegrationDecision, 'domain'>> {
  const q = w.scalar(ctx), p = w.polynomial(ctx, domain.x, q), fraction = w.fraction(ctx, domain.fractions, q);
  const element: w.EvidenceCodec<E> = {
    encode(value) { return fraction.encode(toRationalPrimitiveInput(ctx, owner, domain, value)); },
    decode(value) { return fromRationalPrimitiveInput(ctx, owner, domain, fraction.decode(value)); },
  };
  const derivative = w.structure(ctx, { input: element, derivative: element }), division = w.division(ctx, p), bezout = w.bezout(ctx, p);
  const pair = w.structure(ctx, { coefficients: w.list(ctx, q), primitive: element, normalization: division, derivative });
  return w.structure(ctx, {
    kind: w.literal(ctx, 'solutions', 'no-rational-solution'), rule: w.literal(ctx, limitedIntegrationRule), f: element, generators: w.list(ctx, element),
    reductions: w.list(ctx, w.structure(ctx, { index: w.integer(ctx), input: fraction, hermite: hermiteEvidenceCodec(ctx, domain),
      primitive: element, residual: element, normalization: division, derivative })),
    common: w.structure(ctx, { steps: w.list(ctx, w.structure(ctx, { gcd: bezout, previousQuotient: p, inputQuotient: p, lcm: p })),
      denominator: p, squareFree: bezout, quotients: w.list(ctx, p), numerators: w.list(ctx, p) }),
    system: w.structure(ctx, { rows: w.integer(ctx), columns: w.integer(ctx), matrix: w.list(ctx, w.list(ctx, q)), rhs: w.list(ctx, q) }),
    linear: linearEvidenceCodec(ctx, q),
    family: w.optional(w.structure(ctx, { particular: pair, directions: w.list(ctx, pair), additiveConstant: w.literal(ctx, 'arbitrary-rational') })),
    conditions: w.structure(ctx, { inputs: w.list(ctx, p), primitives: w.list(ctx, p) }),
  });
}
export function encodeRationalLimitedIntegration(ctx: ExecutionContext, owner: DifferentialField, f: E, generators: readonly E[],
  decision: RationalLimitedIntegrationDecision, bounds: ExactArtifactBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyRationalLimitedIntegration(ctx, owner, f, generators, decision); ctx.allocate(5);
    const data = Object.freeze({ tag: 'rational-limited-integration-decision', version: 1, variable: decision.domain.x.variable,
      residueVariable: decision.domain.z.variable, decision: codec(ctx, owner, decision.domain).encode(decision) });
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeRationalLimitedIntegration(ctx: ExecutionContext, owner: DifferentialField, f: E, generators: readonly E[],
  data: unknown, bounds: ExactArtifactBounds): RationalLimitedIntegrationDecision {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'variable', 'residueVariable', 'decision']);
    demand(raw.tag === 'rational-limited-integration-decision' && raw.version === 1, 'invalid-input', 'limited integration artifact version');
    const domain = limitedIntegrationDomain(ctx, owner);
    demand(raw.variable === domain.x.variable && raw.residueVariable === domain.z.variable, 'domain-mismatch', 'limited integration artifact variables');
    const decoded = codec(ctx, owner, domain).decode(raw.decision); ctx.allocate(11);
    demand((decoded.kind === 'solutions') === (decoded.family !== null), 'verification-failed', 'limited integration artifact outcome');
    // The discriminant/family relationship is checked above, and all mathematical authority is replayed below.
    const decision = Object.freeze({ ...decoded, domain }) as RationalLimitedIntegrationDecision;
    verifyRationalLimitedIntegration(ctx, owner, f, generators, decision); return decision;
  });
}
