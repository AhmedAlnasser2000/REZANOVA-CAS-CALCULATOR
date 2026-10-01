import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds, DifferentialField, DifferentialElement as E } from './differential-field';
import { inspectExactArtifact } from './artifact-bounds';
import { decodeDifferentialArtifactInOwner, encodeDifferentialArtifact } from './differential-wire';
import { ExponentialRationalDomain, requireExponentialField } from './exponential-rational-domain';
import { exponentialConditions, verifyExponentialConditions, type ExponentialCondition } from './exponential-rational-conditions';
import { verifyExponentialPrimitive, verifyExponentialLogTerm, type ExponentialPrimitive, type ExponentialPrimitiveDerivative, type ExponentialLogTerm } from './exponential-rational-primitive';
import { SquareFreeQuotientAlgebra } from './quotient-algebra';
import * as w from './decision-wire-algebra';

/** Fixed owner chain, never inference from variable names or an untrusted level. */
export function differentialValueCodec(ctx: ExecutionContext, owner: DifferentialField): w.EvidenceCodec<E> {
  if (owner.kind === 'rational') {
    const c = w.scalar(ctx);
    return { encode(v) { owner.assert(ctx, v); demand(v.kind === 'scalar', 'domain-mismatch', 'wire rational'); return c.encode(v.value); },
      decode(v) { return owner.scalar(ctx, c.decode(v)); } };
  }
  const c = w.fraction(ctx, owner.fractions!, differentialValueCodec(ctx, owner.parent!));
  return { encode(v) { owner.assert(ctx, v); demand(v.kind === 'fraction', 'domain-mismatch', 'wire fraction'); return c.encode(v.value); },
    decode(v) { return owner.fraction(ctx, c.decode(v)); } };
}
export function exponentialPrimitiveCodecs(ctx: ExecutionContext, d: ExponentialRationalDomain) {
  const e = differentialValueCodec(ctx, d.field), p = w.polynomial(ctx, d.fz, e), q = w.polynomial(ctx, d.z, w.scalar(ctx));
  const derivative = w.structure(ctx, { input: e, derivative: e });
  const term: w.EvidenceCodec<ExponentialLogTerm> = {
    encode(t) {
      verifyExponentialLogTerm(ctx, d, t);
      return Object.freeze({ modulus: q.encode(t.modulus), weight: q.encode(t.weight), argument: p.encode(t.argument),
        inverse: w.unitEvidence(ctx, t.algebra, p).encode(t.inverse), norm: e.encode(t.norm), normEvidence: w.prsEvidence(ctx, p, e).encode(t.normEvidence) });
    },
    decode(v) {
      const raw = w.record(ctx, v, ['modulus', 'weight', 'argument', 'inverse', 'norm', 'normEvidence']);
      const modulus = q.decode(raw.modulus), algebra = new SquareFreeQuotientAlgebra(ctx, d.fz, d.lift(ctx, modulus));
      const value = Object.freeze({ domain: d, modulus, algebra, weight: q.decode(raw.weight), argument: p.decode(raw.argument),
        inverse: w.unitEvidence(ctx, algebra, p).decode(raw.inverse), norm: e.decode(raw.norm), normEvidence: w.prsEvidence(ctx, p, e).decode(raw.normEvidence) });
      verifyExponentialLogTerm(ctx, d, value); return value;
    },
  };
  const primitive: w.EvidenceCodec<ExponentialPrimitive> = {
    encode(v) { demand(v.domain === d, 'domain-mismatch', 'primitive wire owner'); return Object.freeze({ fieldPart: e.encode(v.fieldPart), terms: w.list(ctx, term).encode(v.terms) }); },
    decode(v) { const raw = w.record(ctx, v, ['fieldPart', 'terms']); return Object.freeze({ domain: d, fieldPart: e.decode(raw.fieldPart), terms: w.list(ctx, term).decode(raw.terms) }); },
  };
  const proof: w.EvidenceCodec<ExponentialPrimitiveDerivative> = w.structure(ctx, {
    field: derivative, terms: w.list(ctx, w.structure(ctx, { coefficients: w.list(ctx, derivative), logarithmicDerivative: p,
      trace: w.structure(ctx, { columns: w.list(ctx, p), trace: e }) })), derivative: e,
  });
  const path: w.EvidenceCodec<string> = { encode: v => v, decode(v) { ctx.tick(); demand(typeof v === 'string', 'invalid-input', 'condition path'); ctx.allocate(v.length); return v; } };
  const condition: w.EvidenceCodec<ExponentialCondition> = w.structure(ctx, {
    category: w.literal(ctx, 'construction', 'outer-denominator', 'coefficient-denominator', 'log-norm'), path, value: e,
  });
  return { e, p, q, derivative, primitive, proof, term, conditions: w.list(ctx, condition) };
}
export interface ExponentialPrimitiveReplay {
  readonly primitive: ExponentialPrimitive;
  readonly derivative: ExponentialPrimitiveDerivative;
  readonly conditions: readonly ExponentialCondition[];
}
export function encodeExponentialRationalPrimitive(ctx: ExecutionContext, expected: DifferentialField, target: E,
  saved: ExponentialPrimitiveReplay, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    requireExponentialField(ctx, expected, bounds); demand(saved.primitive.domain.field === expected, 'domain-mismatch', 'primitive field');
    const d = saved.primitive.domain; verifyExponentialPrimitive(ctx, saved.primitive, target, saved.derivative, bounds);
    verifyExponentialConditions(ctx, d, exponentialConditions(ctx, d, target, saved.primitive), saved.conditions);
    const c = exponentialPrimitiveCodecs(ctx, d);
    const data = Object.freeze({ tag: 'exponential-rational-primitive', version: 1,
      construction: encodeDifferentialArtifact(ctx, expected, { elements: [target], derivatives: [] }, bounds),
      primitive: c.primitive.encode(saved.primitive), derivative: c.proof.encode(saved.derivative), conditions: c.conditions.encode(saved.conditions) });
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeExponentialRationalPrimitive(ctx: ExecutionContext, expected: DifferentialField, target: E,
  data: unknown, bounds: DifferentialBounds): ExponentialPrimitiveReplay {
  return ctx.operation(() => {
    requireExponentialField(ctx, expected, bounds); expected.assert(ctx, target); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'construction', 'primitive', 'derivative', 'conditions']);
    demand(raw.tag === 'exponential-rational-primitive' && raw.version === 1, 'invalid-input', 'exponential primitive tag');
    const replay = decodeDifferentialArtifactInOwner(ctx, expected, raw.construction, bounds);
    demand(replay.owner === expected && replay.elements.length === 1 && replay.derivatives.length === 0
      && expected.equal(ctx, replay.elements[0], target), 'verification-failed', 'exponential primitive target');
    const d = new ExponentialRationalDomain(ctx, expected, bounds), c = exponentialPrimitiveCodecs(ctx, d);
    const primitive = c.primitive.decode(raw.primitive), derivative = c.proof.decode(raw.derivative), conditions = c.conditions.decode(raw.conditions);
    verifyExponentialPrimitive(ctx, primitive, target, derivative, bounds);
    verifyExponentialConditions(ctx, d, exponentialConditions(ctx, d, target, primitive), conditions);
    return Object.freeze({ primitive, derivative, conditions });
  });
}
