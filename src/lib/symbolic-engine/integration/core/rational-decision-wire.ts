import { demand, type ExecutionContext } from './execution';
import type { FormalPrimitive, FormalPrimitiveDomain, QRationalFunction } from './formal-primitive';
import { encodePrimitive, decodePrimitiveInDomain } from './primitive-wire';
import { PolynomialRing } from './polynomial';
import { SquareFreeQuotientAlgebra } from './quotient-algebra';
import type { HermiteCertificate } from './hermite-reduction';
import type { LrtCertificate, LrtComponent, LrtGroup, ResiduePartitionNode } from './lrt-reduction';
import type { PrimitiveDerivativeCertificate } from './primitive-verification';
import { verifyRationalDecisionWithin, type DecisionConditions, type RationalDecision } from './rational-decision-internal';
import { array, record, structure, list, integer, optional, scalar, polynomial, fraction, division, bezout, squareFreeEvidence,
  prsEvidence, quotientElement, unitEvidence, type EvidenceCodec } from './decision-wire-algebra';

export interface RationalDecisionWire {
  readonly kind: 'rational-integration-decision'; readonly version: 1;
  readonly variable: string; readonly residueVariable: string;
  readonly input: unknown; readonly primitive: unknown; readonly normEvidence: unknown;
  readonly hermite: unknown; readonly lrt: unknown; readonly derivative: unknown; readonly conditions: unknown;
}
function codecs(ctx: ExecutionContext, owner: FormalPrimitiveDomain) {
  const q = scalar(ctx), x = polynomial(ctx, owner.x, q), z = polynomial(ctx, owner.z, q);
  const f = fraction(ctx, owner.fractions, q), argumentsCodec = polynomial(ctx, owner.arguments, z);
  const norm = prsEvidence(ctx, polynomial(ctx, owner.elimination, x), x);
  const conditions = structure(ctx, { rationalDenominator: x, logNorms: list(ctx, x) });
  const decisionConditions: EvidenceCodec<DecisionConditions> = structure(ctx, { inputDenominator: x, rationalDenominator: x, logNorms: list(ctx, x) });
  const hermite: EvidenceCodec<HermiteCertificate> = structure(ctx, {
    division: division(ctx, x), polynomialPrimitive: x, decomposition: squareFreeEvidence(ctx, x, q),
    blocks: list(ctx, structure(ctx, { separation: bezout(ctx, x), numeratorDivision: division(ctx, x), derivativeBezout: bezout(ctx, x),
      steps: list(ctx, structure(ctx, { exponent: integer(ctx, 2), primitiveNumerator: x, nextNumerator: x })) })),
    rationalPart: f, residual: f,
  });
  return { q, x, z, f, argumentsCodec, norm, conditions, decisionConditions, hermite };
}
function lrtCodec(ctx: ExecutionContext, owner: FormalPrimitiveDomain, primitive: FormalPrimitive): EvidenceCodec<LrtCertificate> {
  const c = codecs(ctx, owner);
  const prs = prsEvidence(ctx, c.argumentsCodec, c.z), decomposition = squareFreeEvidence(ctx, c.z, c.q);
  const nodes: EvidenceCodec<ResiduePartitionNode> = {
    encode(node) {
      ctx.allocate(2); return Object.freeze({ modulus: c.z.encode(node.algebra.modulus), analyses: list(ctx, unitEvidence(ctx, node.algebra, c.z)).encode(node.analyses) });
    },
    decode(value) {
      const raw = record(ctx, value, ['modulus', 'analyses']), algebra = new SquareFreeQuotientAlgebra(ctx, owner.z, c.z.decode(raw.modulus));
      return Object.freeze({ algebra, analyses: list(ctx, unitEvidence(ctx, algebra, c.z)).decode(raw.analyses) });
    },
  };
  function componentCodec(nodeList: readonly ResiduePartitionNode[]): EvidenceCodec<LrtComponent> {
    function body(ring: LrtComponent['ring']) {
      const element = quotientElement(ctx, ring.domain, c.z), p = polynomial(ctx, ring, element);
      return structure(ctx, { node: integer(ctx), specializedDegree: integer(ctx, -1), index: integer(ctx, 1),
        normalization: optional(unitEvidence(ctx, ring.domain, c.z)), argument: p,
        denominatorDivision: division(ctx, p), residueDivision: division(ctx, p), term: integer(ctx) });
    }
    return {
      encode(value) {
        const term = primitive.terms.indexOf(value.term); ctx.tick(primitive.terms.length);
        demand(term >= 0, 'verification-failed', 'unbound component term');
        return body(value.ring).encode({ ...value, term });
      },
      decode(value) {
        const raw = record(ctx, value, ['node', 'specializedDegree', 'index', 'normalization', 'argument', 'denominatorDivision', 'residueDivision', 'term']);
        const node = integer(ctx).decode(raw.node); demand(node < nodeList.length, 'invalid-input', 'component node reference');
        ctx.allocate(4); const ring = new PolynomialRing(nodeList[node].algebra, owner.x.variable), decoded = body(ring).decode(value);
        demand(decoded.term < primitive.terms.length, 'invalid-input', 'component term reference');
        return Object.freeze({ ...decoded, ring, term: primitive.terms[decoded.term] });
      },
    };
  }
  const group: EvidenceCodec<LrtGroup> = {
    encode(value) { ctx.allocate(2); return Object.freeze({ nodes: list(ctx, nodes).encode(value.nodes), components: list(ctx, componentCodec(value.nodes)).encode(value.components) }); },
    decode(value) {
      const raw = record(ctx, value, ['nodes', 'components']), nodeList = list(ctx, nodes).decode(raw.nodes);
      return Object.freeze({ nodes: nodeList, components: list(ctx, componentCodec(nodeList)).decode(raw.components) });
    },
  };
  return structure(ctx, { prs, decomposition, groups: list(ctx, group) });
}
function derivativeCodec(ctx: ExecutionContext, owner: FormalPrimitiveDomain, primitive: FormalPrimitive): EvidenceCodec<PrimitiveDerivativeCertificate> {
  const c = codecs(ctx, owner), p = polynomial(ctx, owner.residues, c.f);
  function termCodec(algebra: PrimitiveDerivativeCertificate['terms'][number]['algebra']) {
    return structure(ctx, { inverse: unitEvidence(ctx, algebra, p), logarithmicDerivative: quotientElement(ctx, algebra, p),
      trace: structure(ctx, { columns: list(ctx, p), trace: c.f }) });
  }
  return {
    encode(value) {
      ctx.allocate(value.terms.length + 3);
      return Object.freeze({ terms: Object.freeze(value.terms.map(t => termCodec(t.algebra).encode(t))), derivative: c.f.encode(value.derivative), conditions: c.conditions.encode(value.conditions) });
    },
    decode(value) {
      const raw = record(ctx, value, ['terms', 'derivative', 'conditions']), rawTerms = array(ctx, raw.terms);
      demand(rawTerms.length === primitive.terms.length, 'invalid-input', 'derivative evidence coverage');
      const terms = rawTerms.map((v, i) => {
        const algebra = new SquareFreeQuotientAlgebra(ctx, owner.residues, owner.liftResidue(ctx, primitive.terms[i].modulus));
        ctx.allocate(4); return Object.freeze({ algebra, ...termCodec(algebra).decode(v) });
      });
      return Object.freeze({ terms: Object.freeze(terms), derivative: c.f.decode(raw.derivative), conditions: c.conditions.decode(raw.conditions) });
    },
  };
}
/** Saves every certificate, including norm PRS and inverse/trace evidence. */
function encodeRationalDecisionWithin(ctx: ExecutionContext, owner: FormalPrimitiveDomain, decision: RationalDecision): RationalDecisionWire {
  verifyRationalDecisionWithin(ctx, owner, decision.input, decision);
  const c = codecs(ctx, owner); ctx.allocate(11 + owner.x.variable.length + owner.z.variable.length + decision.primitive.terms.length);
  return Object.freeze({ kind: 'rational-integration-decision', version: 1, variable: owner.x.variable, residueVariable: owner.z.variable,
    input: c.f.encode(decision.input), primitive: encodePrimitive(ctx, decision.primitive),
    normEvidence: list(ctx, c.norm).encode(decision.primitive.terms.map(t => t.normEvidence)),
    hermite: c.hermite.encode(decision.hermite), lrt: optional(lrtCodec(ctx, owner, decision.primitive)).encode(decision.lrt),
    derivative: derivativeCodec(ctx, owner, decision.primitive).encode(decision.derivative), conditions: c.decisionConditions.encode(decision.conditions) });
}
/** Explicit expected input is mandatory. Replay never invokes the integration producers. */
function decodeRationalDecisionWithin(ctx: ExecutionContext, owner: FormalPrimitiveDomain, expected: QRationalFunction, value: unknown): RationalDecision {
  owner.fractions.assert(ctx, expected);
  const raw = record(ctx, value, ['kind', 'version', 'variable', 'residueVariable', 'input', 'primitive', 'normEvidence', 'hermite', 'lrt', 'derivative', 'conditions']);
  demand(raw.kind === 'rational-integration-decision' && raw.version === 1 && raw.variable === owner.x.variable && raw.residueVariable === owner.z.variable,
    'domain-mismatch', 'decision format/variables');
  const c = codecs(ctx, owner), input = c.f.decode(raw.input);
  demand(owner.fractions.equal(ctx, expected, input), 'verification-failed', 'saved input differs from expected input');
  const norms = list(ctx, c.norm).decode(raw.normEvidence);
  const primitive = decodePrimitiveInDomain(ctx, owner, raw.primitive, norms);
  const hermite = c.hermite.decode(raw.hermite), lrt = optional(lrtCodec(ctx, owner, primitive)).decode(raw.lrt);
  const derivative = derivativeCodec(ctx, owner, primitive).decode(raw.derivative), conditions = c.decisionConditions.decode(raw.conditions);
  ctx.allocate(6); const decision = Object.freeze({ input, primitive, hermite, lrt, derivative, conditions });
  verifyRationalDecisionWithin(ctx, owner, expected, decision); return decision;
}

// Public operations always receive fresh validation state.
export function encodeRationalDecision(ctx: ExecutionContext, owner: FormalPrimitiveDomain, decision: RationalDecision): RationalDecisionWire {
  return ctx.operation(() => encodeRationalDecisionWithin(ctx, owner, decision));
}

export function decodeRationalDecision(ctx: ExecutionContext, owner: FormalPrimitiveDomain, expected: QRationalFunction, value: unknown): RationalDecision {
  return ctx.operation(() => decodeRationalDecisionWithin(ctx, owner, expected, value));
}
