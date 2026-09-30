import { demand, type ExecutionContext } from './execution';
import { assertDifferentialFieldOwner, checkDifferentialBounds, type DifferentialField, type DifferentialBounds, type DifferentialElement as E } from './differential-field';
import { inspectExactArtifact } from './artifact-bounds';
import { requireRationalVariable } from './differential-admission';
import { encodeDifferentialArtifact, decodeDifferentialArtifactOverBase } from './differential-wire';
import { encodeRationalRde, decodeRationalRde } from './rational-rde-wire';
import { encodeRational, decodeRational } from './exact-wire';
import * as w from './decision-wire-algebra';
import { verifyHyperexponentialDecision, HYPEREXPONENTIAL_REDUCTION, type HyperexponentialConditions, type HyperexponentialDecision } from './hyperexponential-decision';

function conditionCodec(ctx: ExecutionContext, owner: DifferentialField): w.EvidenceCodec<HyperexponentialConditions> {
  const q = owner.parent!;
  const scalar: w.EvidenceCodec<E> = {
    encode(e) { q.assert(ctx, e); demand(e.kind === 'scalar', 'domain-mismatch', 'hyperexponential condition coefficient'); return encodeRational(ctx, e.value); },
    decode(v) { return q.scalar(ctx, decodeRational(ctx, v)); },
  };
  const p = w.polynomial(ctx, owner.fractions!.ring, scalar);
  return w.structure(ctx, { coefficientDenominator: p, exponentDenominator: p, primitiveCoefficientDenominator: w.optional(p) });
}
/** Complete mathematical decisions only; unsupported input is not proof evidence. */
export function encodeHyperexponentialDecision(ctx: ExecutionContext, owner: DifferentialField, b: E, r: E,
  decision: HyperexponentialDecision, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); verifyHyperexponentialDecision(ctx, owner, b, r, decision);
    // Slots are fixed by outcome and checked in full on replay. Field artifacts
    // carry exact elements, construction/admission and derivative evidence.
    ctx.allocate(20);
    const elements = [decision.b, decision.r, decision.alias, decision.integrand];
    const derivatives = [decision.exponentDerivative];
    if (decision.kind === 'elementary') {
      elements.push(decision.primitive.coefficient, decision.primitive.value); derivatives.push(decision.primitive.derivative);
    }
    const artifact = Object.freeze({ tag: 'hyperexponential-decision', version: 1, kind: decision.kind,
      reduction: decision.reduction, field: encodeDifferentialArtifact(ctx, decision.field, { elements, derivatives }, bounds),
      rde: encodeRationalRde(ctx, owner, decision.exponentDerivative.derivative, b, decision.rde, bounds),
      conditions: conditionCodec(ctx, owner).encode(decision.conditions) });
    inspectExactArtifact(ctx, bounds, artifact); return artifact;
  });
}
export function decodeHyperexponentialDecision(ctx: ExecutionContext, owner: DifferentialField, b: E, r: E,
  data: unknown, bounds: DifferentialBounds): HyperexponentialDecision {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); assertDifferentialFieldOwner(ctx, owner); requireRationalVariable(ctx, owner); owner.assert(ctx, b); owner.assert(ctx, r);
    // Bound the combined artifact, not merely each of its nested certificates.
    inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'kind', 'reduction', 'field', 'rde', 'conditions']);
    demand(raw.tag === 'hyperexponential-decision' && raw.version === 1, 'invalid-input', 'hyperexponential artifact version');
    demand(raw.kind === 'elementary' || raw.kind === 'non-elementary', 'invalid-input', 'hyperexponential artifact outcome');
    demand(raw.reduction === HYPEREXPONENTIAL_REDUCTION, 'verification-failed', 'hyperexponential artifact reduction rule');
    const replay = decodeDifferentialArtifactOverBase(ctx, owner, raw.field, bounds), positive = raw.kind === 'elementary';
    demand(replay.elements.length === (positive ? 6 : 4) && replay.derivatives.length === (positive ? 2 : 1),
      'verification-failed', 'hyperexponential artifact evidence coverage');
    const [storedB, storedR, alias, integrand, coefficient, value] = replay.elements, exponentDerivative = replay.derivatives[0];
    demand(owner.equal(ctx, storedB, b) && owner.equal(ctx, storedR, r), 'verification-failed', 'hyperexponential artifact expected inputs');
    const rde = decodeRationalRde(ctx, owner, exponentDerivative.derivative, b, raw.rde, bounds);
    const conditions = conditionCodec(ctx, owner).decode(raw.conditions);
    ctx.allocate(18);
    const common = { owner, b: storedB, r: storedR, field: replay.owner, alias, integrand, exponentDerivative, rde, conditions,
      reduction: HYPEREXPONENTIAL_REDUCTION };
    const decision: HyperexponentialDecision = positive
      ? Object.freeze({ ...common, kind: 'elementary', primitive: Object.freeze({ coefficient, value, derivative: replay.derivatives[1] }) })
      : Object.freeze({ ...common, kind: 'non-elementary', primitive: null });
    verifyHyperexponentialDecision(ctx, owner, b, r, decision); return decision;
  });
}
