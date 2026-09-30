import { demand, type ExecutionContext } from './execution';
import { checkArtifactBounds, inspectExactArtifact, type ExactArtifactBounds } from './artifact-bounds';
import type { DifferentialField, DifferentialElement as E } from './differential-field';
import { decodeRational, encodeRational } from './exact-wire';
import * as w from './decision-wire-algebra';
import type { EvidenceCodec } from './decision-wire-algebra';
import type { LinearSolution, RowOperation } from './linear-system';
import { rdeDomain, type RdeDomain } from './rde-algebra';
import { verifyRationalRde, type RationalRdeDecision } from './rational-rde';

function bigint(ctx: ExecutionContext): EvidenceCodec<bigint> {
  return {
    encode(n) { const bits = ctx.integer(n); ctx.allocate(bits + 1); return n.toString(); },
    decode(v) {
      demand(typeof v === 'string', 'invalid-input', 'RDE integer string'); ctx.integerText(v);
      demand(/^(0|-?[1-9][0-9]*)$/.test(v), 'invalid-input', 'noncanonical RDE integer');
      const n = BigInt(v); ctx.integer(n); return n;
    },
  };
}
function kind(value: unknown): unknown {
  demand(value !== null && typeof value === 'object', 'invalid-input', 'RDE evidence record');
  const d = Object.getOwnPropertyDescriptor(value, 'kind');
  demand(d !== undefined && 'value' in d, 'invalid-input', 'RDE evidence discriminator'); return d.value;
}
function codec(ctx: ExecutionContext, d: RdeDomain): EvidenceCodec<Omit<RationalRdeDecision, 'domain'>> {
  const q = d.owner.parent!;
  const scalar: EvidenceCodec<E> = {
    encode(value) { q.assert(ctx, value); demand(value.kind === 'scalar', 'domain-mismatch', 'Q wire coefficient'); return encodeRational(ctx, value.value); },
    decode(value) { return q.scalar(ctx, decodeRational(ctx, value)); },
  };
  const nativeFraction = w.fraction(ctx, d.owner.fractions!, scalar);
  const element: EvidenceCodec<E> = {
    encode(value) { d.owner.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'RDE wire value'); return nativeFraction.encode(value.value); },
    decode(value) { return d.owner.fraction(ctx, nativeFraction.decode(value)); },
  };
  const p = w.polynomial(ctx, d.ring, scalar), m = w.polynomial(ctx, d.orders, scalar);
  const mx = w.polynomial(ctx, d.resultantRing, m), bezout = w.bezout(ctx, p), number = bigint(ctx);
  const triple = w.structure(ctx, { pair: bezout, common: bezout, A: p, B: p, C: p });
  const rootEvidence = w.structure(ctx, {
    squareFree: w.squareFreeEvidence(ctx, m, scalar), polynomial: m, sturm: w.list(ctx, m), divisions: w.list(ctx, w.division(ctx, m)),
    bound: number, intervals: w.list(ctx, w.structure(ctx, { lower: number, upper: number, leftVariation: w.integer(ctx), rightVariation: w.integer(ctx), root: w.literal(ctx, false, true) })),
    roots: w.list(ctx, number),
  });
  const resonance = w.structure(ctx, { leadingUnit: bezout, resultant: w.prsEvidence(ctx, mx, m), integers: rootEvidence, splits: w.list(ctx, bezout) });
  const derivative = w.structure(ctx, { input: element, derivative: element });
  const solution = w.structure(ctx, { particular: element, homogeneous: w.list(ctx, element), derivatives: w.list(ctx, derivative) });
  const swap = w.structure(ctx, { kind: w.literal(ctx, 'swap'), target: w.integer(ctx), source: w.integer(ctx) });
  const scale = w.structure(ctx, { kind: w.literal(ctx, 'scale'), target: w.integer(ctx), factor: scalar });
  const add = w.structure(ctx, { kind: w.literal(ctx, 'add'), target: w.integer(ctx), source: w.integer(ctx), factor: scalar });
  const operation: EvidenceCodec<RowOperation<E>> = {
    encode(op) { return op.kind === 'swap' ? swap.encode(op) : op.kind === 'scale' ? scale.encode(op) : add.encode(op); },
    decode(v) {
      const k = kind(v); if (k === 'swap') return swap.decode(v); if (k === 'scale') return scale.decode(v);
      demand(k === 'add', 'invalid-input', 'RDE row operation'); return add.decode(v);
    },
  };
  const common = { operations: w.list(ctx, operation), reduced: w.list(ctx, w.list(ctx, scalar)), rank: w.integer(ctx), pivots: w.list(ctx, w.integer(ctx)) };
  const consistent = w.structure(ctx, { ...common, kind: w.literal(ctx, 'consistent'), particular: w.list(ctx, scalar), nullspace: w.list(ctx, w.list(ctx, scalar)) });
  const inconsistent = w.structure(ctx, { ...common, kind: w.literal(ctx, 'inconsistent'), witness: w.list(ctx, scalar) });
  const linear: EvidenceCodec<LinearSolution<E>> = {
    encode(v) { return v.kind === 'consistent' ? consistent.encode(v) : inconsistent.encode(v); },
    decode(v) { const k = kind(v); if (k === 'consistent') return consistent.decode(v);
      demand(k === 'inconsistent', 'invalid-input', 'RDE linear outcome'); return inconsistent.decode(v); },
  };
  return w.structure(ctx, {
    kind: w.literal(ctx, 'solutions', 'no-rational-solution'), a: element, b: element,
    clearing: w.structure(ctx, { gcd: bezout, lcm: p, quotientA: p, quotientB: p, primitive: triple }),
    denominator: w.structure(ctx, { squareFree: w.squareFreeEvidence(ctx, p, scalar), hasseA: w.list(ctx, p), hasseB: w.list(ctx, p),
      blocks: w.list(ctx, w.structure(ctx, { valuationSplits: w.list(ctx, bezout), resonance: w.optional(resonance) })), denominator: p }),
    polynomial: triple,
    degree: w.structure(ctx, { delta: w.integer(ctx, -1), slope: scalar, intercept: scalar, forcing: w.optional(number), resonance: w.optional(number), bound: number }),
    system: w.structure(ctx, { rows: w.integer(ctx), columns: w.integer(ctx), matrix: w.list(ctx, w.list(ctx, scalar)), rhs: w.list(ctx, scalar) }),
    linear, solution: w.optional(solution), conditions: w.structure(ctx, { coefficients: w.list(ctx, p), solutions: w.list(ctx, p) }),
  });
}
export function encodeRationalRde(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E, decision: RationalRdeDecision,
  bounds: ExactArtifactBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyRationalRde(ctx, owner, a, b, decision);
    ctx.allocate(4);
    const result = { tag: 'rational-rde-decision', version: 1, variable: decision.domain.ring.variable,
      decision: codec(ctx, decision.domain).encode(decision) };
    inspectExactArtifact(ctx, bounds, result); return result;
  });
}
export function decodeRationalRde(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E, data: unknown,
  bounds: ExactArtifactBounds): RationalRdeDecision {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
    const raw = w.record(ctx, data, ['tag', 'version', 'variable', 'decision']), domain = rdeDomain(ctx, owner);
    demand(raw.tag === 'rational-rde-decision' && raw.version === 1, 'invalid-input', 'RDE artifact version');
    demand(raw.variable === domain.ring.variable, 'domain-mismatch', 'RDE artifact variable');
    const decoded = codec(ctx, domain).decode(raw.decision); ctx.allocate(13);
    const result = Object.freeze({ ...decoded, domain }); verifyRationalRde(ctx, owner, a, b, result); return result;
  });
}
