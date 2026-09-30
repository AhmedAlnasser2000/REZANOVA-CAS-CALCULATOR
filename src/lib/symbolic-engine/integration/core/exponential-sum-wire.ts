import { demand, type ExecutionContext } from './execution';
import { checkDifferentialBounds, type DifferentialBounds, type DifferentialField, type DifferentialElement as E } from './differential-field';
import { inspectExactArtifact } from './artifact-bounds';
import { decodeRational, encodeRational } from './exact-wire';
import { decodeDifferentialArtifactOverBase, encodeDifferentialArtifact } from './differential-wire';
import { decodeRationalRde, encodeRationalRde } from './rational-rde-wire';
import { decodeRationalDecision, encodeRationalDecision } from './rational-decision-wire';
import { FormalPrimitiveDomain } from './formal-primitive';
import { toRationalPrimitiveInput } from './exponential-sum-bridge';
import { checkSumInput, verifySumNormalization } from './exponential-sum-normalization';
import { sumRdeTarget, verifySumWithin } from './exponential-sum-verification';
import { EXPONENTIAL_SUM_REDUCTION, type ExponentialSumInput, type ExponentialSumDecision,
  type ExponentialSumCondition, type ExponentialSumPrimitive } from './exponential-sum-types';
import * as w from './decision-wire-algebra';

function codecs(ctx: ExecutionContext, owner: DifferentialField) {
  const scalar: w.EvidenceCodec<E> = {
    encode(v) { owner.parent!.assert(ctx, v); demand(v.kind === 'scalar', 'domain-mismatch', 'sum wire scalar'); return encodeRational(ctx, v.value); },
    decode(v) { return owner.parent!.scalar(ctx, decodeRational(ctx, v)); },
  };
  const fraction = w.fraction(ctx, owner.fractions!, scalar);
  const element: w.EvidenceCodec<E> = {
    encode(v) { owner.assert(ctx, v); demand(v.kind === 'fraction', 'domain-mismatch', 'sum wire element'); return fraction.encode(v.value); },
    decode(v) { return owner.fraction(ctx, fraction.decode(v)); },
  };
  const integer: w.EvidenceCodec<bigint> = {
    encode(v) { const bits = ctx.integer(v); ctx.allocate(bits + 1); return v.toString(); },
    decode(v) {
      demand(typeof v === 'string', 'invalid-input', 'sum exponent string'); ctx.integerText(v);
      demand(/^(0|-?[1-9][0-9]*)$/.test(v), 'invalid-input', 'sum canonical exponent');
      const n = BigInt(v); ctx.integer(n); return n;
    },
  };
  const input = w.structure(ctx, { rationalPart: element, terms: w.list(ctx, w.structure(ctx, { coefficient: element, argument: element })) });
  const normalization = w.structure(ctx, { rationalPart: element,
    groups: w.list(ctx, w.structure(ctx, { argument: element, coefficient: element, indices: w.list(ctx, w.integer(ctx)) })) });
  const components = w.list(ctx, w.structure(ctx, { group: w.integer(ctx), exponent: integer }));
  const condition: w.EvidenceCodec<ExponentialSumCondition> = w.structure(ctx, {
    kind: w.literal(ctx, 'input-rational', 'input-coefficient', 'input-argument', 'normalized-rational',
      'primitive-rational', 'primitive-log-norm', 'primitive-coefficient'), index: w.integer(ctx), value: element,
  });
  const base = w.structure(ctx, { integrand: element, exponential: element,
    derivative: w.structure(ctx, { input: element, derivative: element }), assembledDerivative: element });
  return { input, normalization, components, conditions: w.list(ctx, condition), base };
}
export function encodeExponentialSumDecision(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialSumInput,
  decision: ExponentialSumDecision, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifySumWithin(ctx, owner, input, decision, bounds); const c = codecs(ctx, owner), p = decision.primitive;
    ctx.allocate(20 + decision.components.length + 3 * decision.solved.length);
    const elements = decision.components.map(t => t.alias); elements.push(decision.integrand);
    if (p) elements.push(p.exponential, p.assembledDerivative);
    const field = decision.field ? encodeDifferentialArtifact(ctx, decision.field,
      { elements, derivatives: p ? [p.derivative] : [] }, bounds) : null;
    const base = !decision.field && p ? c.base.encode({ integrand: decision.integrand, exponential: p.exponential,
      derivative: p.derivative, assembledDerivative: p.assembledDerivative }) : null;
    const artifact = Object.freeze({ tag: 'exponential-sum-decision', version: 1, kind: decision.kind, reduction: decision.reduction,
      input: c.input.encode(decision.input), normalization: c.normalization.encode(decision.normalization),
      components: c.components.encode(decision.components),
      solved: Object.freeze(decision.solved.map(s => Object.freeze({ component: s.component,
        rde: encodeRationalRde(ctx, owner, sumRdeTarget(ctx, owner, decision, s.component),
          decision.normalization.groups[decision.components[s.component].group].coefficient, s.rde, bounds) }))),
      field, base, rational: p ? encodeRationalDecision(ctx, p.domain, p.rational) : null,
      conditions: c.conditions.encode(decision.conditions) });
    inspectExactArtifact(ctx, bounds, artifact); return artifact;
  });
}
export function decodeExponentialSumDecision(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialSumInput,
  data: unknown, bounds: DifferentialBounds): ExponentialSumDecision {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); checkSumInput(ctx, owner, input); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'kind', 'reduction', 'input', 'normalization', 'components', 'solved', 'field', 'base', 'rational', 'conditions']);
    demand(raw.tag === 'exponential-sum-decision' && raw.version === 1, 'invalid-input', 'sum artifact version');
    demand(raw.kind === 'elementary' || raw.kind === 'non-elementary', 'invalid-input', 'sum artifact outcome');
    demand(raw.reduction === EXPONENTIAL_SUM_REDUCTION, 'verification-failed', 'sum artifact rule');
    const c = codecs(ctx, owner), stored = c.input.decode(raw.input), positive = raw.kind === 'elementary';
    demand(stored.terms.length === input.terms.length && owner.equal(ctx, stored.rationalPart, input.rationalPart),
      'verification-failed', 'sum saved input');
    for (let i = 0; i < input.terms.length; i++) {
      ctx.tick(); demand(owner.equal(ctx, input.terms[i].coefficient, stored.terms[i].coefficient)
        && owner.equal(ctx, input.terms[i].argument, stored.terms[i].argument), 'verification-failed', 'sum saved ordered terms');
    }
    const normalization = c.normalization.decode(raw.normalization);
    const active = verifySumNormalization(ctx, owner, stored, normalization), metadata = c.components.decode(raw.components);
    demand(metadata.length === active.length, 'verification-failed', 'sum saved component coverage');
    const replay = raw.field === null ? null : decodeDifferentialArtifactOverBase(ctx, owner, raw.field, bounds);
    demand((active.length === 0) === (replay === null), 'verification-failed', 'sum saved field coverage');
    if (replay) demand(raw.base === null && replay.elements.length === metadata.length + (positive ? 3 : 1)
      && replay.derivatives.length === (positive ? 1 : 0), 'verification-failed', 'sum saved field slots');
    else demand(positive && raw.base !== null, 'verification-failed', 'sum saved pure rational outcome');
    const base = replay ? null : c.base.decode(raw.base), field = replay?.owner ?? null;
    ctx.allocate(metadata.length * 4 + 12);
    const components = Object.freeze(metadata.map((m, i) => {
      demand(m.group < normalization.groups.length, 'verification-failed', 'sum saved group reference');
      return Object.freeze({ ...m, alias: replay!.elements[i] });
    }));
    const integrand = replay ? replay.elements[metadata.length] : base!.integrand;
    const rawSolved = w.array(ctx, raw.solved);
    demand(rawSolved.length <= components.length, 'verification-failed', 'sum saved solved coverage');
    const solved = Object.freeze(rawSolved.map((v, i) => {
      const item = w.record(ctx, v, ['component', 'rde']);
      demand(item.component === i, 'verification-failed', 'sum saved solved prefix'); ctx.allocate(2);
      return Object.freeze({ component: i, rde: decodeRationalRde(ctx, owner, sumRdeTarget(ctx, owner, { field, components }, i),
        normalization.groups[components[i].group].coefficient, item.rde, bounds) });
    }));
    let primitive: ExponentialSumPrimitive | null = null;
    if (positive) {
      const variable = owner.fractions!.ring.variable; ctx.allocate(21);
      const domain = new FormalPrimitiveDomain(variable, variable === 'z' ? 'z1' : 'z');
      const rational = decodeRationalDecision(ctx, domain, toRationalPrimitiveInput(ctx, owner, domain, normalization.rationalPart), raw.rational);
      primitive = Object.freeze({ domain, rational,
        exponential: replay ? replay.elements[metadata.length + 1] : base!.exponential,
        derivative: replay ? replay.derivatives[0] : base!.derivative,
        assembledDerivative: replay ? replay.elements[metadata.length + 2] : base!.assembledDerivative });
    } else demand(raw.rational === null, 'verification-failed', 'negative sum rational evidence');
    const common = { owner, input: stored, normalization, field, components, solved, integrand,
      reduction: EXPONENTIAL_SUM_REDUCTION, conditions: c.conditions.decode(raw.conditions) };
    const decision: ExponentialSumDecision = primitive
      ? Object.freeze({ ...common, kind: 'elementary', primitive })
      : Object.freeze({ ...common, kind: 'non-elementary', primitive: null });
    verifySumWithin(ctx, owner, input, decision, bounds); return decision;
  });
}
