import { demand, type ExecutionContext } from './execution';
import { checkDifferentialBounds, type DifferentialBounds, type DifferentialField } from './differential-field';
import { inspectExactArtifact } from './artifact-bounds';
import { MultivariateRing } from './multivariate-polynomial';
import { normalizationNodes, type NormalizationNode } from './exponential-normalization-expression';
import { verifyExponentialNormalization } from './exponential-normalization';
import type { ExponentialNormalization, ExponentialNormalizationInput, ExponentialClassification } from './exponential-normalization-types';
import * as w from './decision-wire-algebra';
import { normalizationBaseCodec, normalizationGcdCodec, normalizationInteger, normalizationKind,
  normalizationLinearCodec, normalizationPolynomialCodec, normalizationText } from './exponential-normalization-wire-values';

function nodesCodec(ctx: ExecutionContext, owner: DifferentialField): w.EvidenceCodec<readonly NormalizationNode[]> {
  const {element} = normalizationBaseCodec(ctx, owner), index = w.integer(ctx), integer = normalizationInteger(ctx);
  const atom = w.structure(ctx, {kind: w.literal(ctx, 'rational', 'exponential'), value: element, argumentIndex: index});
  const binary = w.structure(ctx, {kind: w.literal(ctx, 'add', 'subtract', 'multiply', 'divide'), left: index, right: index});
  const negate = w.structure(ctx, {kind: w.literal(ctx, 'negate'), value: index});
  const power = w.structure(ctx, {kind: w.literal(ctx, 'power'), value: index, exponent: integer});
  const node: w.EvidenceCodec<NormalizationNode> = {
    encode(v) {
      if (v.kind === 'rational' || v.kind === 'exponential') return atom.encode(v);
      if (v.kind === 'negate') return negate.encode(v); if (v.kind === 'power') return power.encode(v);
      demand('left' in v, 'invalid-input', 'normalization binary node'); return binary.encode(v);
    },
    decode(v) {
      const kind = normalizationKind(v);
      if (kind === 'rational' || kind === 'exponential') return atom.decode(v);
      if (kind === 'negate') return negate.decode(v); if (kind === 'power') return power.decode(v);
      demand(kind === 'add' || kind === 'subtract' || kind === 'multiply' || kind === 'divide', 'invalid-input', 'normalization source kind');
      return binary.decode(v);
    },
  };
  return w.list(ctx, node);
}
function sourceCodec(ctx: ExecutionContext, owner: DifferentialField) {
  return w.structure(ctx, {nodes: nodesCodec(ctx, owner), root: w.integer(ctx),
    restrictions: w.list(ctx, w.structure(ctx, {node: w.integer(ctx), provenance: normalizationText(ctx)}))});
}
function checkSource(ctx: ExecutionContext, owner: DifferentialField, a: ReturnType<typeof normalizationNodes>, b: ReturnType<ReturnType<typeof sourceCodec>['decode']>) {
  demand(a.root === b.root && a.nodes.length === b.nodes.length && a.restrictions.length === b.restrictions.length,
    'verification-failed', 'saved normalization input coverage');
  for (let i = 0; i < a.nodes.length; i++) {
    ctx.tick(); const x = a.nodes[i], y = b.nodes[i]; demand(x.kind === y.kind, 'verification-failed', 'saved normalization input kind');
    if ((x.kind === 'rational' || x.kind === 'exponential') && (y.kind === 'rational' || y.kind === 'exponential')) {
      demand(x.argumentIndex === y.argumentIndex && owner.equal(ctx, x.value, y.value), 'verification-failed', 'saved normalization atom');
    } else if ((x.kind === 'negate' || x.kind === 'power') && (y.kind === 'negate' || y.kind === 'power')) {
      demand(x.value === y.value && (x.kind !== 'power' || (y.kind === 'power' && x.exponent === y.exponent)), 'verification-failed', 'saved normalization power');
    } else {
      demand('left' in x && 'left' in y && x.left === y.left && x.right === y.right, 'verification-failed', 'saved normalization operands');
    }
  }
  for (let i = 0; i < a.restrictions.length; i++) demand(a.restrictions[i].node === b.restrictions[i].node
    && a.restrictions[i].provenance === b.restrictions[i].provenance, 'verification-failed', 'saved source restriction');
}
function evidenceCodec(ctx: ExecutionContext, owner: DifferentialField, ring: MultivariateRing<import('./differential-field').DifferentialElement>) {
  const {element, polynomial} = normalizationBaseCodec(ctx, owner), integer = normalizationInteger(ctx);
  const p = normalizationPolynomialCodec(ctx, ring, element), fraction = w.structure(ctx, {numerator: p, denominator: p});
  const term = w.structure(ctx, {power: integer, coefficient: element});
  const rational = w.structure(ctx, {kind: w.literal(ctx, 'rational'), value: element});
  const exponential = w.structure(ctx, {kind: w.literal(ctx, 'exponential'), argument: element, numerator: w.list(ctx, term), denominator: w.list(ctx, term)});
  const unsupported = w.structure(ctx, {kind: w.literal(ctx, 'unsupported'), reason: w.literal(ctx, 'constant-extension', 'independent-families')});
  const classification: w.EvidenceCodec<ExponentialClassification> = {
    encode(v) { return v.kind === 'rational' ? rational.encode(v) : v.kind === 'exponential' ? exponential.encode(v) : unsupported.encode(v); },
    decode(v) {
      const kind = normalizationKind(v); if (kind === 'rational') return rational.decode(v); if (kind === 'exponential') return exponential.decode(v);
      demand(kind === 'unsupported', 'invalid-input', 'normalization classification kind'); return unsupported.decode(v);
    },
  };
  return w.structure(ctx, {
    basis: w.structure(ctx, {denominator: polynomial, quotients: w.list(ctx, polynomial), elimination: normalizationLinearCodec(ctx),
      scales: w.list(ctx, integer), basis: w.list(ctx, element), coordinates: w.list(ctx, w.list(ctx, integer))}),
    steps: w.list(ctx, w.structure(ctx, {value: fraction, cancellation: normalizationGcdCodec(ctx, ring, element)})),
    restrictions: w.list(ctx, w.structure(ctx, {node: w.integer(ctx), kind: w.literal(ctx, 'rational-denominator', 'argument-denominator', 'division', 'nonpositive-power', 'supplied'),
      provenance: normalizationText(ctx), value: fraction})), classification,
  });
}
export function encodeExponentialNormalization(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialNormalizationInput,
  proof: ExponentialNormalization, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    verifyExponentialNormalization(ctx, owner, input, proof, bounds);
    const flat = normalizationNodes(ctx, owner, input, bounds); ctx.allocate(7);
    const out = Object.freeze({tag: 'exponential-normalization', version: 1, variable: owner.fractions!.ring.variable, arity: proof.ring.arity,
      source: sourceCodec(ctx, owner).encode(flat), evidence: evidenceCodec(ctx, owner, proof.ring).encode(proof)});
    inspectExactArtifact(ctx, bounds, out); return out;
  });
}
export function decodeExponentialNormalization(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialNormalizationInput,
  data: unknown, bounds: DifferentialBounds): ExponentialNormalization {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
    const flat = normalizationNodes(ctx, owner, input, bounds);
    const raw = w.record(ctx, data, ['tag', 'version', 'variable', 'arity', 'source', 'evidence']);
    demand(raw.tag === 'exponential-normalization' && raw.version === 1, 'invalid-input', 'normalization artifact version');
    demand(raw.variable === owner.fractions!.ring.variable, 'domain-mismatch', 'normalization artifact variable');
    checkSource(ctx, owner, flat, sourceCodec(ctx, owner).decode(raw.source));
    const arity = w.integer(ctx, 1).decode(raw.arity);
    demand(arity <= flat.arguments.length + 1, 'invalid-input', 'normalization artifact arity');
    const ring = MultivariateRing.create(ctx, owner, arity), evidence = evidenceCodec(ctx, owner, ring).decode(raw.evidence);
    ctx.allocate(5); const result = Object.freeze({...evidence, ring});
    verifyExponentialNormalization(ctx, owner, input, result, bounds); return result;
  });
}
