import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialElement as E, DifferentialBounds } from './differential-field';
import { inspectExactArtifact } from './artifact-bounds';
import { decodeDifferentialArtifactInOwner, encodeDifferentialArtifact } from './differential-wire';
import { ExponentialRationalDomain, requireExponentialField } from './exponential-rational-domain';
import { EXPONENTIAL_RATIONAL_REDUCTION, verifyExponentialRationalDecision, type ExponentialRationalDecision } from './exponential-rational-decision';
import { decodeExponentialSumDecision, encodeExponentialSumDecision } from './exponential-sum-wire';
import { exponentialReductionCodecs } from './exponential-rational-wire-evidence';
import * as w from './decision-wire-algebra';

export function encodeExponentialRationalDecision(ctx: ExecutionContext, owner: DifferentialField, input: E,
  decision: ExponentialRationalDecision, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyExponentialRationalDecision(ctx, owner, input, decision, bounds);
    const c = exponentialReductionCodecs(ctx, decision.domain), r = decision.remainder; ctx.allocate(15);
    const data = Object.freeze({ tag: 'exponential-rational-decision', version: 1, rule: decision.rule, kind: decision.kind, obstruction: decision.obstruction,
      construction: encodeDifferentialArtifact(ctx, owner, { elements: [input], derivatives: [] }, bounds),
      hermite: c.hermite.encode(decision.hermite), residue: w.optional(c.residue).encode(decision.residue),
      remainder: r ? c.remainder.encode(r) : null,
      sum: r ? encodeExponentialSumDecision(ctx, decision.domain.base, r.request, r.sum, bounds) : null,
      embedding: w.optional(c.primitive).encode(decision.embedding), primitive: w.optional(c.primitive).encode(decision.primitive),
      derivative: w.optional(c.proof).encode(decision.derivative), conditions: c.conditions.encode(decision.conditions) });
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeExponentialRationalDecision(ctx: ExecutionContext, owner: DifferentialField, input: E,
  data: unknown, bounds: DifferentialBounds): ExponentialRationalDecision {
  return ctx.operation(() => {
    requireExponentialField(ctx, owner, bounds); owner.assert(ctx, input); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'rule', 'kind', 'obstruction', 'construction', 'hermite', 'residue', 'remainder', 'sum', 'embedding', 'primitive', 'derivative', 'conditions']);
    demand(raw.tag === 'exponential-rational-decision' && raw.version === 1 && raw.rule === EXPONENTIAL_RATIONAL_REDUCTION, 'invalid-input', 'exponential rational decision format');
    const bound = decodeDifferentialArtifactInOwner(ctx, owner, raw.construction, bounds);
    demand(bound.owner === owner && bound.elements.length === 1 && bound.derivatives.length === 0
      && owner.equal(ctx, input, bound.elements[0]), 'verification-failed', 'saved decision input');
    const d = new ExponentialRationalDomain(ctx, owner, bounds), c = exponentialReductionCodecs(ctx, d);
    const hermite = c.hermite.decode(raw.hermite), residue = w.optional(c.residue).decode(raw.residue);
    const decoded = w.optional(c.remainder).decode(raw.remainder);
    demand((decoded === null) === (raw.sum === null), 'invalid-input', 'saved Laurent decision coverage');
    const remainder = decoded ? Object.freeze({ ...decoded, sum: decodeExponentialSumDecision(ctx, d.base, decoded.request, raw.sum, bounds) }) : null;
    const embedding = w.optional(c.primitive).decode(raw.embedding), primitive = w.optional(c.primitive).decode(raw.primitive), derivative = w.optional(c.proof).decode(raw.derivative);
    const common = { domain: d, input: bound.elements[0], rule: EXPONENTIAL_RATIONAL_REDUCTION, hermite, residue, conditions: c.conditions.decode(raw.conditions) };
    let result: ExponentialRationalDecision;
    if (raw.kind === 'elementary') {
      demand(raw.obstruction === null && remainder !== null && embedding !== null && primitive !== null && derivative !== null, 'invalid-input', 'saved elementary evidence');
      result = Object.freeze({ ...common, kind: 'elementary', obstruction: null, remainder, embedding, primitive, derivative });
    } else {
      demand(raw.kind === 'non-elementary' && embedding === null && primitive === null && derivative === null, 'invalid-input', 'saved negative evidence');
      if (raw.obstruction === 'nonconstant-residue') {
        demand(remainder === null, 'invalid-input', 'residue obstruction stop');
        result = Object.freeze({ ...common, kind: 'non-elementary', obstruction: 'nonconstant-residue', remainder, embedding, primitive, derivative });
      } else {
        demand(raw.obstruction === 'laurent' && remainder !== null, 'invalid-input', 'Laurent obstruction evidence');
        result = Object.freeze({ ...common, kind: 'non-elementary', obstruction: 'laurent', remainder, embedding, primitive, derivative });
      }
    }
    verifyExponentialRationalDecision(ctx, owner, input, result, bounds); return result;
  });
}
