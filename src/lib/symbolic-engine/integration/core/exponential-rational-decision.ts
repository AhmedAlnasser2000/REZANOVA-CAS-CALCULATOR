import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialBounds, DifferentialElement as E } from './differential-field';
import { ExponentialRationalDomain, assertExponentialRationalDomain, requireExponentialField } from './exponential-rational-domain';
import { differentialHermite, verifyDifferentialHermite, exponentialDenominatorPower, type DifferentialHermite } from './exponential-rational-hermite';
import { exponentialResidues, verifyExponentialResidues, type ExponentialResidue } from './exponential-rational-residue';
import { exponentialPrimitive, differentiateExponentialPrimitive, verifyExponentialPrimitive,
  type ExponentialPrimitive, type ExponentialPrimitiveDerivative, type ExponentialLogTerm } from './exponential-rational-primitive';
import { exponentialConditions, verifyExponentialConditions, type ExponentialCondition } from './exponential-rational-conditions';
import { embedRationalPrimitive, verifyRationalPrimitiveEmbedding } from './exponential-rational-bridge';
import { integrateExponentialSum, verifyExponentialSumDecision, type ExponentialSumInput, type ExponentialSumDecision } from './exponential-sum-decision';
import { sumPower } from './exponential-sum-verification';

export const EXPONENTIAL_RATIONAL_REDUCTION = 'rational-exponential-residue-liouville-v1' as const;
export interface ExponentialRationalRemainder {
  readonly logarithms: ExponentialPrimitive;
  readonly derivative: ExponentialPrimitiveDerivative;
  readonly remainder: E;
  readonly powers: readonly bigint[];
  readonly request: ExponentialSumInput;
  readonly sum: ExponentialSumDecision;
}
interface Common {
  readonly domain: ExponentialRationalDomain;
  readonly input: E;
  readonly rule: typeof EXPONENTIAL_RATIONAL_REDUCTION;
  readonly hermite: DifferentialHermite;
  readonly residue: ExponentialResidue | null;
  readonly conditions: readonly ExponentialCondition[];
}
export type ExponentialRationalDecision = Readonly<Common & (
  { kind: 'non-elementary'; obstruction: 'nonconstant-residue'; remainder: null; embedding: null; primitive: null; derivative: null }
  | { kind: 'non-elementary'; obstruction: 'laurent'; remainder: ExponentialRationalRemainder; embedding: null; primitive: null; derivative: null }
  | { kind: 'elementary'; obstruction: null; remainder: ExponentialRationalRemainder; embedding: ExponentialPrimitive;
      primitive: ExponentialPrimitive; derivative: ExponentialPrimitiveDerivative }
)>;
/** Coefficient slots are explicitly retained even when the nested sum rebases its generator. */
export function extractExponentialLaurent(ctx: ExecutionContext, d: ExponentialRationalDomain, value: E) {
  d.field.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'Laurent fraction');
  const den = value.value.denominator, offset = exponentialDenominatorPower(ctx, d, den), a = d.field.admission;
  demand(offset === d.t.degree(ctx, den) && a?.kind === 'exponential', 'verification-failed', 'Laurent denominator');
  let rationalPart = d.base.fromInteger(ctx, 0n); const powers: bigint[] = [], terms: ExponentialSumInput['terms'][number][] = [];
  for (let i = 0; i < value.value.numerator.coefficients.length; i++) {
    ctx.tick(); const coefficient = value.value.numerator.coefficients[i]; if (d.base.isZero(ctx, coefficient)) continue;
    const power = BigInt(i) - BigInt(offset); ctx.integer(power);
    if (power === 0n) rationalPart = coefficient;
    else {
      ctx.allocate(3); powers.push(power); terms.push(Object.freeze({ coefficient,
        argument: d.base.multiply(ctx, a.argument, d.base.fromInteger(ctx, power)) }));
    }
  }
  return Object.freeze({ powers: Object.freeze(powers), request: Object.freeze({ rationalPart, terms: Object.freeze(terms) }) });
}
export function sameExponentialTerms(ctx: ExecutionContext, d: ExponentialRationalDomain,
  a: readonly ExponentialLogTerm[], b: readonly ExponentialLogTerm[]): void {
  demand(a.length === b.length, 'verification-failed', 'logarithm coverage');
  for (let i = 0; i < a.length; i++) {
    ctx.tick(); demand(a[i].domain === d && b[i].domain === d && d.z.equal(ctx, a[i].modulus, b[i].modulus)
      && d.z.equal(ctx, a[i].weight, b[i].weight) && d.fz.equal(ctx, a[i].argument, b[i].argument)
      && d.field.equal(ctx, a[i].norm, b[i].norm), 'verification-failed', 'logarithm correspondence');
  }
}
export function reconstructExponentialSum(ctx: ExecutionContext, d: ExponentialRationalDomain, proof: ExponentialRationalRemainder): E {
  const f = d.field, sum = proof.sum; demand(sum.kind === 'elementary', 'verification-failed', 'complete Laurent solution required');
  demand(sum.solved.length === proof.powers.length, 'verification-failed', 'Laurent solved coverage');
  ctx.allocate(proof.powers.length); const covered = new Set<number>(); let out = f.fromInteger(ctx, 0n);
  for (const solved of sum.solved) {
    ctx.tick(); const component = sum.components[solved.component], group = sum.normalization.groups[component.group];
    demand(group.indices.length === 1 && solved.rde.solution !== null, 'verification-failed', 'Laurent coefficient correspondence');
    const index = group.indices[0]; demand(index < proof.powers.length && !covered.has(index), 'verification-failed', 'Laurent power coverage'); covered.add(index);
    demand(d.base.equal(ctx, group.argument, proof.request.terms[index].argument)
      && d.base.equal(ctx, group.coefficient, proof.request.terms[index].coefficient), 'verification-failed', 'Laurent argument correspondence');
    out = f.add(ctx, out, f.multiply(ctx, f.embed(ctx, solved.rde.solution.particular), sumPower(ctx, f, proof.powers[index])));
  }
  return out;
}
export function residueLogTerms(ctx: ExecutionContext, residue: ExponentialResidue | null): readonly ExponentialLogTerm[] {
  const out: ExponentialLogTerm[] = [];
  if (residue) for (const g of residue.groups) {
    ctx.allocate(g.components.length);
    for (const c of g.components) { ctx.tick(); out.push(c.term); }
  }
  return Object.freeze(out);
}
export function integrateExponentialRational(ctx: ExecutionContext, owner: DifferentialField, input: E,
  bounds: DifferentialBounds): ExponentialRationalDecision {
  return ctx.operation(() => {
    const d = new ExponentialRationalDomain(ctx, owner, bounds); owner.assert(ctx, input);
    const hermite = differentialHermite(ctx, d, input);
    const residue = owner.isZero(ctx, hermite.residual) ? null : exponentialResidues(ctx, d, hermite.residual);
    const common = { domain: d, input, rule: EXPONENTIAL_RATIONAL_REDUCTION, hermite, residue }; ctx.allocate(12);
    let result: ExponentialRationalDecision;
    if (residue?.nonconstant !== null && residue !== null) {
      result = Object.freeze({ ...common, kind: 'non-elementary', obstruction: 'nonconstant-residue', remainder: null, embedding: null,
        primitive: null, derivative: null, conditions: exponentialConditions(ctx, d, input) });
    } else {
      const terms = residueLogTerms(ctx, residue);
      const logarithms = exponentialPrimitive(ctx, d, owner.fromInteger(ctx, 0n), terms), derivative = differentiateExponentialPrimitive(ctx, logarithms, bounds);
      const value = owner.subtract(ctx, owner.add(ctx, hermite.laurent, hermite.residual), derivative.derivative);
      const extracted = extractExponentialLaurent(ctx, d, value), sum = integrateExponentialSum(ctx, d.base, extracted.request, bounds);
      demand(sum.kind !== 'unsupported', 'verification-failed', 'one-family Laurent remainder refused');
      const remainder = Object.freeze({ logarithms, derivative, remainder: value, ...extracted, sum });
      if (sum.kind === 'non-elementary') result = Object.freeze({ ...common, kind: 'non-elementary', obstruction: 'laurent', remainder,
        embedding: null, primitive: null, derivative: null, conditions: exponentialConditions(ctx, d, input) });
      else {
        const embedding = embedRationalPrimitive(ctx, d, sum.primitive.rational.primitive), exponential = reconstructExponentialSum(ctx, d, remainder);
        ctx.allocate(terms.length + embedding.terms.length);
        const primitive = exponentialPrimitive(ctx, d, owner.add(ctx, hermite.fieldPart, owner.add(ctx, embedding.fieldPart, exponential)), [...terms, ...embedding.terms]);
        const proof = differentiateExponentialPrimitive(ctx, primitive, bounds);
        result = Object.freeze({ ...common, kind: 'elementary', obstruction: null, remainder, embedding, primitive, derivative: proof,
          conditions: exponentialConditions(ctx, d, input, primitive) });
      }
    }
    verifyExponentialRationalDecision(ctx, owner, input, result, bounds); return result;
  });
}
export function verifyExponentialRationalDecision(ctx: ExecutionContext, owner: DifferentialField, input: E,
  decision: ExponentialRationalDecision, bounds: DifferentialBounds): void {
  ctx.operation(() => {
    requireExponentialField(ctx, owner, bounds); owner.assert(ctx, input); const d = decision.domain; assertExponentialRationalDomain(ctx, d);
    demand(d.field === owner && decision.rule === EXPONENTIAL_RATIONAL_REDUCTION && owner.equal(ctx, input, decision.input),
      'verification-failed', 'exponential rational input/rule');
    verifyDifferentialHermite(ctx, d, input, decision.hermite);
    const h = decision.hermite;
    demand((decision.residue === null) === owner.isZero(ctx, h.residual), 'verification-failed', 'residue evidence coverage');
    if (decision.residue) verifyExponentialResidues(ctx, d, h.residual, decision.residue);
    if (decision.kind === 'non-elementary' && decision.obstruction === 'nonconstant-residue') {
      demand(decision.residue !== null && decision.residue.nonconstant !== null && decision.remainder === null
        && decision.embedding === null && decision.primitive === null && decision.derivative === null, 'verification-failed', 'residue obstruction authority');
    } else {
      demand(decision.residue === null || decision.residue.nonconstant === null, 'verification-failed', 'nonconstant residues cannot proceed');
      const r = decision.remainder; demand(r !== null, 'verification-failed', 'missing Laurent proof');
      const terms = residueLogTerms(ctx, decision.residue);
      sameExponentialTerms(ctx, d, terms, r.logarithms.terms); demand(owner.isZero(ctx, r.logarithms.fieldPart), 'verification-failed', 'residue logs field part');
      verifyExponentialPrimitive(ctx, r.logarithms, r.derivative.derivative, r.derivative, bounds);
      demand(owner.equal(ctx, r.remainder, owner.subtract(ctx, owner.add(ctx, h.laurent, h.residual), r.derivative.derivative)),
        'verification-failed', 'Laurent remainder identity');
      const extracted = extractExponentialLaurent(ctx, d, r.remainder);
      demand(extracted.powers.length === r.powers.length && r.request.terms.length === r.powers.length
        && d.base.equal(ctx, extracted.request.rationalPart, r.request.rationalPart), 'verification-failed', 'Laurent slot coverage');
      for (let i = 0; i < r.powers.length; i++) {
        ctx.tick(); demand(extracted.powers[i] === r.powers[i] && d.base.equal(ctx, extracted.request.terms[i].coefficient, r.request.terms[i].coefficient)
          && d.base.equal(ctx, extracted.request.terms[i].argument, r.request.terms[i].argument), 'verification-failed', 'Laurent slot identity');
      }
      verifyExponentialSumDecision(ctx, d.base, r.request, r.sum, bounds);
      if (decision.kind === 'non-elementary') {
        demand(decision.obstruction === 'laurent' && r.sum.kind === 'non-elementary' && decision.embedding === null
          && decision.primitive === null && decision.derivative === null, 'verification-failed', 'Laurent obstruction authority');
      } else {
        demand(decision.kind === 'elementary' && decision.obstruction === null && r.sum.kind === 'elementary', 'verification-failed', 'elementary result');
        verifyRationalPrimitiveEmbedding(ctx, d, r.sum.primitive.rational.primitive, decision.embedding);
        ctx.allocate(terms.length + decision.embedding.terms.length);
        sameExponentialTerms(ctx, d, [...terms, ...decision.embedding.terms], decision.primitive.terms);
        const expected = owner.add(ctx, h.fieldPart, owner.add(ctx, decision.embedding.fieldPart, reconstructExponentialSum(ctx, d, r)));
        demand(owner.equal(ctx, expected, decision.primitive.fieldPart), 'verification-failed', 'primitive field assembly');
        verifyExponentialPrimitive(ctx, decision.primitive, input, decision.derivative, bounds);
      }
    }
    verifyExponentialConditions(ctx, d, exponentialConditions(ctx, d, input, decision.primitive ?? undefined), decision.conditions);
  });
}
