import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialBounds, DifferentialElement as E } from './differential-field';
import { LogarithmicRationalDomain, assertLogarithmicRationalDomain, requireLogarithmicField } from './logarithmic-rational-domain';
import { logarithmicHermite, verifyLogarithmicHermite, type DifferentialHermite } from './logarithmic-rational-hermite';
import { logarithmicResidues, verifyLogarithmicResidues, type LogarithmicResidue } from './logarithmic-rational-residue';
import { logarithmicPrimitive, differentiateLogarithmicPrimitive, verifyLogarithmicPrimitive,
  type LogarithmicPrimitive, type LogarithmicPrimitiveDerivative, type LogarithmicLogTerm } from './logarithmic-rational-primitive';
import { logarithmicConditions, verifyLogarithmicConditions, type LogarithmicCondition } from './logarithmic-rational-conditions';
import { embedRationalPrimitive, verifyRationalPrimitiveEmbedding } from './logarithmic-rational-bridge';
import { reduceLogarithmicPolynomial, verifyLogarithmicPolynomial, type LogarithmicPolynomialReduction } from './logarithmic-rational-polynomial';
import { limitedIntegrationDomain } from './rational-limited-integration';
import { toRationalPrimitiveInput } from './exponential-sum-bridge';
import { integrateRational, verifyRationalDecision, type RationalDecision } from './rational-decision';

export const LOGARITHMIC_RATIONAL_REDUCTION = 'rational-logarithmic-residue-liouville-v1' as const;
export interface LogarithmicRationalRemainder {
  readonly logarithms: LogarithmicPrimitive;
  readonly derivative: LogarithmicPrimitiveDerivative;
  readonly polynomial: E;
  readonly reduction: LogarithmicPolynomialReduction;
}
interface Common {
  readonly domain: LogarithmicRationalDomain;
  readonly input: E;
  readonly rule: typeof LOGARITHMIC_RATIONAL_REDUCTION;
  readonly hermite: DifferentialHermite;
  readonly residue: LogarithmicResidue | null;
  readonly conditions: readonly LogarithmicCondition[];
}
export type LogarithmicRationalDecision = Readonly<Common & (
  { kind: 'non-elementary'; obstruction: 'nonconstant-residue'; remainder: null; rational: null; embedding: null; primitive: null; derivative: null }
  | { kind: 'non-elementary'; obstruction: 'polynomial-coefficient'; remainder: LogarithmicRationalRemainder; rational: null; embedding: null; primitive: null; derivative: null }
  | { kind: 'elementary'; obstruction: null; remainder: LogarithmicRationalRemainder; rational: RationalDecision;
      embedding: LogarithmicPrimitive; primitive: LogarithmicPrimitive; derivative: LogarithmicPrimitiveDerivative }
)>;
export function logarithmicResidueTerms(ctx: ExecutionContext, proof: LogarithmicResidue | null): readonly LogarithmicLogTerm[] {
  const terms: LogarithmicLogTerm[] = [];
  if (proof) for (const group of proof.groups) {
    ctx.allocate(group.components.length); for (const component of group.components) { ctx.tick(); terms.push(component.term); }
  }
  return Object.freeze(terms);
}
function sameTerms(ctx: ExecutionContext, d: LogarithmicRationalDomain, a: readonly LogarithmicLogTerm[], b: readonly LogarithmicLogTerm[]): void {
  demand(a.length === b.length, 'verification-failed', 'logarithm assembly coverage');
  for (let i = 0; i < a.length; i++) {
    ctx.tick(); demand(a[i].domain === d && b[i].domain === d && d.z.equal(ctx, a[i].modulus, b[i].modulus)
      && d.z.equal(ctx, a[i].weight, b[i].weight) && d.fz.equal(ctx, a[i].argument, b[i].argument)
      && d.field.equal(ctx, a[i].norm, b[i].norm), 'verification-failed', 'exact logarithm assembly');
  }
}
export function integrateLogarithmicRational(ctx: ExecutionContext, owner: DifferentialField, input: E, bounds: DifferentialBounds): LogarithmicRationalDecision {
  return ctx.operation(() => {
    const d = new LogarithmicRationalDomain(ctx, owner, bounds); owner.assert(ctx, input);
    const hermite = logarithmicHermite(ctx, d, input), residue = owner.isZero(ctx, hermite.residual) ? null : logarithmicResidues(ctx, d, hermite.residual);
    const common = { domain: d, input, rule: LOGARITHMIC_RATIONAL_REDUCTION, hermite, residue }; ctx.allocate(15);
    let out: LogarithmicRationalDecision;
    if (residue !== null && residue.nonconstant !== null) {
      out = Object.freeze({ ...common, kind: 'non-elementary', obstruction: 'nonconstant-residue', remainder: null,
        rational: null, embedding: null, primitive: null, derivative: null, conditions: logarithmicConditions(ctx, d, input) });
    } else {
      const terms = logarithmicResidueTerms(ctx, residue), logarithms = logarithmicPrimitive(ctx, d, owner.fromInteger(ctx, 0n), terms);
      const derivative = differentiateLogarithmicPrimitive(ctx, logarithms, bounds);
      const polynomial = owner.subtract(ctx, owner.add(ctx, hermite.laurent, hermite.residual), derivative.derivative);
      const reduction = reduceLogarithmicPolynomial(ctx, d, polynomial), remainder = Object.freeze({ logarithms, derivative, polynomial, reduction });
      if (reduction.failure !== null) {
        out = Object.freeze({ ...common, kind: 'non-elementary', obstruction: 'polynomial-coefficient', remainder,
          rational: null, embedding: null, primitive: null, derivative: null, conditions: logarithmicConditions(ctx, d, input) });
      } else {
        demand(reduction.remainder !== null, 'verification-failed', 'missing base remainder');
        const native = limitedIntegrationDomain(ctx, d.base), value = toRationalPrimitiveInput(ctx, d.base, native, reduction.remainder);
        const rational = integrateRational(ctx, native, value), embedding = embedRationalPrimitive(ctx, d, rational.primitive);
        ctx.allocate(terms.length + embedding.terms.length);
        const field = owner.add(ctx, hermite.fieldPart, owner.add(ctx, reduction.fieldPart, embedding.fieldPart));
        const primitive = logarithmicPrimitive(ctx, d, field, [...terms, ...embedding.terms]);
        out = Object.freeze({ ...common, kind: 'elementary', obstruction: null, remainder, rational, embedding, primitive,
          derivative: differentiateLogarithmicPrimitive(ctx, primitive, bounds), conditions: logarithmicConditions(ctx, d, input, primitive) });
      }
    }
    verifyLogarithmicRationalDecision(ctx, owner, input, out, bounds); return out;
  });
}
export function verifyLogarithmicRationalDecision(ctx: ExecutionContext, owner: DifferentialField, input: E,
  decision: LogarithmicRationalDecision, bounds: DifferentialBounds): void {
  ctx.operation(() => {
    requireLogarithmicField(ctx, owner, bounds); owner.assert(ctx, input); const d = decision.domain; assertLogarithmicRationalDomain(ctx, d);
    demand(d.field === owner && decision.rule === LOGARITHMIC_RATIONAL_REDUCTION && owner.equal(ctx, decision.input, input), 'verification-failed', 'logarithmic input/rule');
    verifyLogarithmicHermite(ctx, d, input, decision.hermite); const h = decision.hermite;
    demand((decision.residue === null) === owner.isZero(ctx, h.residual), 'verification-failed', 'residue coverage');
    if (decision.residue) verifyLogarithmicResidues(ctx, d, h.residual, decision.residue);
    if (decision.kind === 'non-elementary' && decision.obstruction === 'nonconstant-residue') {
      demand(decision.residue !== null && decision.residue.nonconstant !== null && decision.remainder === null
        && decision.rational === null && decision.embedding === null && decision.primitive === null && decision.derivative === null,
      'verification-failed', 'nonconstant residue authority');
    } else {
      demand(decision.residue === null || decision.residue.nonconstant === null, 'verification-failed', 'residue obstruction cannot proceed');
      const r = decision.remainder; demand(r !== null, 'verification-failed', 'missing polynomial reduction');
      const terms = logarithmicResidueTerms(ctx, decision.residue); sameTerms(ctx, d, terms, r.logarithms.terms);
      demand(r.logarithms.domain === d && owner.isZero(ctx, r.logarithms.fieldPart), 'verification-failed', 'residue logarithm field part');
      verifyLogarithmicPrimitive(ctx, r.logarithms, r.derivative.derivative, r.derivative, bounds);
      demand(owner.equal(ctx, r.polynomial, owner.subtract(ctx, owner.add(ctx, h.laurent, h.residual), r.derivative.derivative)), 'verification-failed', 'polynomial remainder identity');
      verifyLogarithmicPolynomial(ctx, d, r.polynomial, r.reduction);
      if (decision.kind === 'non-elementary') {
        demand(decision.obstruction === 'polynomial-coefficient' && r.reduction.failure !== null && decision.rational === null
          && decision.embedding === null && decision.primitive === null && decision.derivative === null, 'verification-failed', 'polynomial obstruction authority');
      } else {
        demand(decision.kind === 'elementary' && decision.obstruction === null && r.reduction.failure === null && r.reduction.remainder !== null
          && decision.rational !== null && decision.embedding !== null && decision.primitive !== null && decision.derivative !== null, 'verification-failed', 'complete elementary decision');
        const native = decision.rational.primitive.owner, value = toRationalPrimitiveInput(ctx, d.base, native, r.reduction.remainder);
        verifyRationalDecision(ctx, native, value, decision.rational); verifyRationalPrimitiveEmbedding(ctx, d, decision.rational.primitive, decision.embedding);
        ctx.allocate(terms.length + decision.embedding.terms.length); sameTerms(ctx, d, [...terms, ...decision.embedding.terms], decision.primitive.terms);
        const field = owner.add(ctx, h.fieldPart, owner.add(ctx, r.reduction.fieldPart, decision.embedding.fieldPart));
        demand(decision.primitive.domain === d && owner.equal(ctx, field, decision.primitive.fieldPart), 'verification-failed', 'complete field assembly');
        verifyLogarithmicPrimitive(ctx, decision.primitive, input, decision.derivative, bounds);
      }
    }
    verifyLogarithmicConditions(ctx, d, logarithmicConditions(ctx, d, input, decision.primitive ?? undefined), decision.conditions);
  });
}
