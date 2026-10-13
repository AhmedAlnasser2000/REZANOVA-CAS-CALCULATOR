import { demand, type ExecutionContext } from './execution';
import type { FormalPrimitive, FormalPrimitiveDomain } from './formal-primitive';
import { SquareFreeQuotientAlgebra } from './quotient-algebra';
import type { PrimitiveDerivativeCertificate } from './primitive-verification-internal';
import * as w from './decision-wire-algebra';

/** The existing version-one rational derivative evidence ritual, shared without
 * changing its wire layout or derivative authority. */
export function rationalPrimitiveDerivativeCodec(ctx: ExecutionContext, owner: FormalPrimitiveDomain, primitive: FormalPrimitive): w.EvidenceCodec<PrimitiveDerivativeCertificate> {
  const f = w.fraction(ctx, owner.fractions, w.scalar(ctx)), p = w.polynomial(ctx, owner.residues, f), x = w.polynomial(ctx, owner.x, w.scalar(ctx)), conditions = w.structure(ctx, {rationalDenominator: x, logNorms: w.list(ctx, x)});
  function termCodec(algebra: PrimitiveDerivativeCertificate['terms'][number]['algebra']) {
    return w.structure(ctx, {inverse: w.unitEvidence(ctx, algebra, p), logarithmicDerivative: w.quotientElement(ctx, algebra, p), trace: w.structure(ctx, {columns: w.list(ctx, p), trace: f})});
  }
  return {encode(value) {
    ctx.allocate(value.terms.length + 3); return Object.freeze({terms: Object.freeze(value.terms.map(t => termCodec(t.algebra).encode(t))), derivative: f.encode(value.derivative), conditions: conditions.encode(value.conditions)});
  }, decode(value) {
    const raw = w.record(ctx, value, ['terms', 'derivative', 'conditions']), rawTerms = w.array(ctx, raw.terms); demand(rawTerms.length === primitive.terms.length, 'invalid-input', 'derivative evidence coverage');
    const terms = rawTerms.map((v, i) => { const algebra = new SquareFreeQuotientAlgebra(ctx, owner.residues, owner.liftResidue(ctx, primitive.terms[i].modulus)); ctx.allocate(4); return Object.freeze({algebra, ...termCodec(algebra).decode(v)}); });
    return Object.freeze({terms: Object.freeze(terms), derivative: f.decode(raw.derivative), conditions: conditions.decode(raw.conditions)});
  }};
}
