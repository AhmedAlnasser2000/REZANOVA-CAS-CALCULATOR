import { demand, type ExecutionContext } from './execution';
import { PolynomialRing } from './polynomial';
import { SquareFreeQuotientAlgebra } from './quotient-algebra';
import type { FirstLevelRationalDomain } from './first-level-rational-domain';
import { differentialValueCodec, firstLevelPrimitiveCodecs } from './first-level-rational-primitive-codecs';
import type { DifferentialHermite } from './first-level-rational-hermite';
import type { FirstLevelResidue } from './first-level-rational-residue';
import type { LrtComponent, LrtGroup, ResiduePartitionNode } from './first-level-rational-selection';
import * as w from './decision-wire-algebra';

export function firstLevelReductionCodecs<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, d: D) {
  const c = firstLevelPrimitiveCodecs(ctx, d), base = differentialValueCodec(ctx, d.base);
  const t = w.polynomial(ctx, d.t, base), z = w.polynomial(ctx, d.kz, base);
  const hermite: w.EvidenceCodec<DifferentialHermite> = w.structure(ctx, {
    power: w.integer(ctx), normalDenominator: t, decomposition: w.squareFreeEvidence(ctx, t, base), division: w.division(ctx, t),
    blocks: w.list(ctx, w.structure(ctx, { separation: w.bezout(ctx, t), division: w.division(ctx, t), derivative: c.derivative,
      normal: w.bezout(ctx, t), steps: w.list(ctx, w.structure(ctx, { exponent: w.integer(ctx, 2), numerator: t, derivative: c.derivative, next: t })) })),
    fieldPart: c.e, derivative: c.derivative, laurent: c.e, residual: c.e,
  });
  const nodes: w.EvidenceCodec<ResiduePartitionNode> = {
    encode(v) { return Object.freeze({ modulus: z.encode(v.algebra.modulus), analyses: w.list(ctx, w.unitEvidence(ctx, v.algebra, z)).encode(v.analyses) }); },
    decode(v) {
      const raw = w.record(ctx, v, ['modulus', 'analyses']), algebra = new SquareFreeQuotientAlgebra(ctx, d.kz, z.decode(raw.modulus));
      return Object.freeze({ algebra, analyses: w.list(ctx, w.unitEvidence(ctx, algebra, z)).decode(raw.analyses) });
    },
  };
  const components = (nodeList: readonly ResiduePartitionNode[]): w.EvidenceCodec<LrtComponent<D>> => {
    const body = (ring: LrtComponent<D>['ring']) => {
      const p = w.polynomial(ctx, ring, w.quotientElement(ctx, ring.domain, z));
      return w.structure(ctx, { node: w.integer(ctx), specializedDegree: w.integer(ctx, -1), index: w.integer(ctx, 1),
        normalization: w.optional(w.unitEvidence(ctx, ring.domain, z)), argument: p, denominatorDivision: w.division(ctx, p),
        residueDivision: w.division(ctx, p), term: c.term });
    };
    return {
      encode(v) { return body(v.ring).encode(v); },
      decode(v) {
        const raw = w.record(ctx, v, ['node', 'specializedDegree', 'index', 'normalization', 'argument', 'denominatorDivision', 'residueDivision', 'term']);
        const index = w.integer(ctx).decode(raw.node); demand(index < nodeList.length, 'invalid-input', 'selection node reference');
        const ring = new PolynomialRing(nodeList[index].algebra, d.t.variable); ctx.allocate(4);
        return Object.freeze({ ...body(ring).decode(v), ring });
      },
    };
  };
  const group: w.EvidenceCodec<LrtGroup<D>> = {
    encode(v) { return Object.freeze({ nodes: w.list(ctx, nodes).encode(v.nodes), components: w.list(ctx, components(v.nodes)).encode(v.components) }); },
    decode(v) { const raw = w.record(ctx, v, ['nodes', 'components']), list = w.list(ctx, nodes).decode(raw.nodes);
      return Object.freeze({ nodes: list, components: w.list(ctx, components(list)).decode(raw.components) }); },
  };
  const residue: w.EvidenceCodec<FirstLevelResidue<D>> = w.structure(ctx, {
    denominatorDerivative: c.derivative, normal: w.bezout(ctx, t), prs: w.prsEvidence(ctx, w.polynomial(ctx, d.elimination, z), z),
    scalar: base, monic: z, coefficients: w.list(ctx, w.structure(ctx, { input: base, derivative: base })),
    nonconstant: w.optional(w.integer(ctx)), decomposition: w.optional(w.squareFreeEvidence(ctx, c.q, w.scalar(ctx))), groups: w.list(ctx, group),
  });
  return { ...c, hermite, residue };
}
