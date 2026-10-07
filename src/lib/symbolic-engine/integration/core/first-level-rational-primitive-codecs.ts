import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialElement as E } from './differential-field';
import type { FirstLevelRationalDomain } from './first-level-rational-domain';
import { verifyFirstLevelLogTerm, type FirstLevelLogTerm, type FirstLevelPrimitive, type FirstLevelPrimitiveDerivative } from './first-level-rational-primitive';
import type { FirstLevelCondition } from './first-level-rational-conditions';
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
export function firstLevelPrimitiveCodecs<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, d: D) {
  const e = differentialValueCodec(ctx, d.field), p = w.polynomial(ctx, d.fz, e), q = w.polynomial(ctx, d.z, w.scalar(ctx));
  const derivative = w.structure(ctx, { input: e, derivative: e });
  const term: w.EvidenceCodec<FirstLevelLogTerm<D>> = {
    encode(t) {
      verifyFirstLevelLogTerm(ctx, d, t);
      return Object.freeze({ modulus: q.encode(t.modulus), weight: q.encode(t.weight), argument: p.encode(t.argument),
        inverse: w.unitEvidence(ctx, t.algebra, p).encode(t.inverse), norm: e.encode(t.norm), normEvidence: w.prsEvidence(ctx, p, e).encode(t.normEvidence) });
    },
    decode(v) {
      const raw = w.record(ctx, v, ['modulus', 'weight', 'argument', 'inverse', 'norm', 'normEvidence']);
      const modulus = q.decode(raw.modulus), algebra = new SquareFreeQuotientAlgebra(ctx, d.fz, d.lift(ctx, modulus));
      const value = Object.freeze({ domain: d, modulus, algebra, weight: q.decode(raw.weight), argument: p.decode(raw.argument),
        inverse: w.unitEvidence(ctx, algebra, p).decode(raw.inverse), norm: e.decode(raw.norm), normEvidence: w.prsEvidence(ctx, p, e).decode(raw.normEvidence) });
      verifyFirstLevelLogTerm(ctx, d, value); return value;
    },
  };
  const primitive: w.EvidenceCodec<FirstLevelPrimitive<D>> = {
    encode(v) { demand(v.domain === d, 'domain-mismatch', 'primitive wire owner'); return Object.freeze({ fieldPart: e.encode(v.fieldPart), terms: w.list(ctx, term).encode(v.terms) }); },
    decode(v) { const raw = w.record(ctx, v, ['fieldPart', 'terms']); return Object.freeze({ domain: d, fieldPart: e.decode(raw.fieldPart), terms: w.list(ctx, term).decode(raw.terms) }); },
  };
  const proof: w.EvidenceCodec<FirstLevelPrimitiveDerivative> = w.structure(ctx, {
    field: derivative, terms: w.list(ctx, w.structure(ctx, { coefficients: w.list(ctx, derivative), logarithmicDerivative: p,
      trace: w.structure(ctx, { columns: w.list(ctx, p), trace: e }) })), derivative: e,
  });
  const path: w.EvidenceCodec<string> = { encode: v => v, decode(v) { ctx.tick(); demand(typeof v === 'string', 'invalid-input', 'condition path'); ctx.allocate(v.length); return v; } };
  const condition: w.EvidenceCodec<FirstLevelCondition> = w.structure(ctx, {
    category: w.literal(ctx, 'construction', 'outer-denominator', 'coefficient-denominator', 'log-norm'), path, value: e,
  });
  return { e, p, q, derivative, primitive, proof, term, conditions: w.list(ctx, condition) };
}
