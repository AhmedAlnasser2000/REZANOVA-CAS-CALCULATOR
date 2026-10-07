import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialBounds, DifferentialElement as E } from './differential-field';
import { inspectExactArtifact } from './artifact-bounds';
import { encodeDifferentialArtifact, decodeDifferentialArtifactInOwner } from './differential-wire';
import { LogarithmicRationalDomain, requireLogarithmicField } from './logarithmic-rational-domain';
import { LOGARITHMIC_RATIONAL_REDUCTION, verifyLogarithmicRationalDecision, type LogarithmicRationalDecision } from './logarithmic-rational-decision';
import { firstLevelReductionCodecs } from './first-level-rational-reduction-codecs';
import { differentialValueCodec } from './first-level-rational-primitive-codecs';
import type { LogarithmicPolynomialStep } from './logarithmic-rational-polynomial';
import { encodeRationalLimitedIntegration, decodeRationalLimitedIntegration } from './rational-limited-integration-wire';
import { limitedIntegrationDomain } from './rational-limited-integration';
import { toRationalPrimitiveInput } from './exponential-sum-bridge';
import { encodeRationalDecision, decodeRationalDecision } from './rational-decision-wire';
import * as w from './decision-wire-algebra';

function codecs(ctx: ExecutionContext, d: LogarithmicRationalDomain, bounds: DifferentialBounds) {
  const c = firstLevelReductionCodecs(ctx, d), base = differentialValueCodec(ctx, d.base), a = d.field.rule!.coefficients[0];
  const degree: w.EvidenceCodec<bigint> = {
    encode(v) { ctx.integer(v); const out = v.toString(); ctx.allocate(out.length); return out; },
    decode(v) {
      demand(typeof v === 'string', 'invalid-input', 'polynomial degree string'); ctx.integerText(v);
      demand(/^[1-9][0-9]*$/.test(v), 'invalid-input', 'canonical positive degree'); const out = BigInt(v); ctx.integer(out); return out;
    },
  };
  // The enclosing envelope is bounded first; this payload gains authority only
  // through its explicit-owner limited-integration replay below.
  const nested: w.EvidenceCodec<unknown> = { encode: v => v, decode: v => v };
  const body = w.structure(ctx, { degree, input: c.e, leading: base, limited: nested,
    correction: w.optional(c.e), derivative: w.optional(c.derivative), next: w.optional(c.e) });
  const step: w.EvidenceCodec<LogarithmicPolynomialStep> = {
    encode(v) { return body.encode({ ...v, limited: encodeRationalLimitedIntegration(ctx, d.base, v.leading, [a], v.limited, bounds) }); },
    decode(v) { const b = body.decode(v); return Object.freeze({ ...b,
      limited: decodeRationalLimitedIntegration(ctx, d.base, b.leading, [a], b.limited, bounds) }); },
  };
  const reduction = w.structure(ctx, { input: c.e, steps: w.list(ctx, step), fieldPart: c.e, remainder: w.optional(base), failure: w.optional(w.integer(ctx)) });
  const remainder = w.structure(ctx, { logarithms: c.primitive, derivative: c.proof, polynomial: c.e, reduction });
  return { ...c, remainder };
}
export function encodeLogarithmicRationalDecision(ctx: ExecutionContext, owner: DifferentialField, input: E,
  decision: LogarithmicRationalDecision, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyLogarithmicRationalDecision(ctx, owner, input, decision, bounds); const c = codecs(ctx, decision.domain, bounds); ctx.allocate(16);
    const data = Object.freeze({ tag: 'logarithmic-rational-decision', version: 1, rule: decision.rule, kind: decision.kind, obstruction: decision.obstruction,
      construction: encodeDifferentialArtifact(ctx, owner, { elements: [input], derivatives: [] }, bounds),
      hermite: c.hermite.encode(decision.hermite), residue: w.optional(c.residue).encode(decision.residue), remainder: w.optional(c.remainder).encode(decision.remainder),
      rational: decision.rational ? encodeRationalDecision(ctx, decision.rational.primitive.owner, decision.rational) : null,
      embedding: w.optional(c.primitive).encode(decision.embedding), primitive: w.optional(c.primitive).encode(decision.primitive),
      derivative: w.optional(c.proof).encode(decision.derivative), conditions: c.conditions.encode(decision.conditions) });
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeLogarithmicRationalDecision(ctx: ExecutionContext, owner: DifferentialField, input: E,
  data: unknown, bounds: DifferentialBounds): LogarithmicRationalDecision {
  return ctx.operation(() => {
    requireLogarithmicField(ctx, owner, bounds); owner.assert(ctx, input); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'rule', 'kind', 'obstruction', 'construction', 'hermite', 'residue', 'remainder', 'rational', 'embedding', 'primitive', 'derivative', 'conditions']);
    demand(raw.tag === 'logarithmic-rational-decision' && raw.version === 1 && raw.rule === LOGARITHMIC_RATIONAL_REDUCTION,
      'invalid-input', 'logarithmic rational artifact format');
    const bound = decodeDifferentialArtifactInOwner(ctx, owner, raw.construction, bounds);
    demand(bound.owner === owner && bound.elements.length === 1 && bound.derivatives.length === 0 && owner.equal(ctx, input, bound.elements[0]),
      'verification-failed', 'saved logarithmic input');
    const d = new LogarithmicRationalDomain(ctx, owner, bounds), c = codecs(ctx, d, bounds);
    const hermite = c.hermite.decode(raw.hermite), residue = w.optional(c.residue).decode(raw.residue), remainder = w.optional(c.remainder).decode(raw.remainder);
    let rational = null;
    if (raw.rational !== null) {
      demand(remainder !== null && remainder.reduction.failure === null && remainder.reduction.remainder !== null, 'verification-failed', 'saved rational remainder coverage');
      const native = limitedIntegrationDomain(ctx, d.base), value = toRationalPrimitiveInput(ctx, d.base, native, remainder.reduction.remainder);
      rational = decodeRationalDecision(ctx, native, value, raw.rational);
    }
    const embedding = w.optional(c.primitive).decode(raw.embedding), primitive = w.optional(c.primitive).decode(raw.primitive);
    const derivative = w.optional(c.proof).decode(raw.derivative), conditions = c.conditions.decode(raw.conditions);
    demand(raw.kind === 'elementary' || raw.kind === 'non-elementary', 'invalid-input', 'logarithmic decision kind');
    demand(raw.obstruction === null || raw.obstruction === 'nonconstant-residue' || raw.obstruction === 'polynomial-coefficient', 'invalid-input', 'logarithmic obstruction kind');
    // Discriminants and all conditional coverage receive full mathematical
    // verification before this reconstructed value can leave the operation.
    const decision = Object.freeze({ domain: d, input, rule: LOGARITHMIC_RATIONAL_REDUCTION, kind: raw.kind, obstruction: raw.obstruction,
      hermite, residue, remainder, rational, embedding, primitive, derivative, conditions }) as LogarithmicRationalDecision;
    verifyLogarithmicRationalDecision(ctx, owner, input, decision, bounds); return decision;
  });
}
