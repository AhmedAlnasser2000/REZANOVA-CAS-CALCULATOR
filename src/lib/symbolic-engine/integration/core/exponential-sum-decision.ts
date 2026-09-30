import { demand, type ExecutionContext } from './execution';
import { checkDifferentialBounds, type DifferentialBounds, type DifferentialField } from './differential-field';
import { buildExponential } from './differential-admission';
import { differentiate } from './differential-derivative';
import { FormalPrimitiveDomain } from './formal-primitive';
import { hyperexponentialVariable } from './hyperexponential-decision';
import { integrateRational } from './rational-decision';
import { solveRationalRde } from './rational-rde';
import { fromRationalPrimitiveInput, toRationalPrimitiveInput } from './exponential-sum-bridge';
import { copySumInput, normalizeSum, sumUnsupported, verifySumNormalization } from './exponential-sum-normalization';
import { sumConditions, sumRdeTarget, verifySumWithin } from './exponential-sum-verification';
import { EXPONENTIAL_SUM_REDUCTION, type ExponentialSumInput, type ExponentialSumDecision, type ExponentialSumResult,
  type ExponentialSumComponent, type ExponentialSumSolvedComponent, type ExponentialSumPrimitive } from './exponential-sum-types';
export type { ExponentialSumInput, ExponentialSumDecision, ExponentialSumResult } from './exponential-sum-types';

export function verifyExponentialSumDecision(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialSumInput,
  decision: ExponentialSumDecision, bounds: DifferentialBounds): void {
  ctx.operation(() => verifySumWithin(ctx, owner, input, decision, bounds));
}
export function integrateExponentialSum(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialSumInput,
  bounds: DifferentialBounds): ExponentialSumResult {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); input = copySumInput(ctx, owner, input);
    const normalization = normalizeSum(ctx, owner, input), active = verifySumNormalization(ctx, owner, input, normalization);
    const reason = sumUnsupported(ctx, owner, normalization, active);
    if (reason) { ctx.allocate(2); return Object.freeze({ kind: 'unsupported', reason }); }
    let field: DifferentialField | null = null; const components: ExponentialSumComponent[] = []; ctx.allocate(active.length);
    if (active.length) {
      ctx.allocate(active.length);
      const admitted = buildExponential(ctx, owner, hyperexponentialVariable(owner), active.map(i => normalization.groups[i].argument), bounds);
      if (admitted.status === 'unsupported') {
        demand(admitted.reason === 'not-rational-multiples', 'verification-failed', 'unexpected sum admission refusal');
        ctx.allocate(2); return Object.freeze({ kind: 'unsupported', reason: 'not-rational-multiples' });
      }
      field = admitted.field; const admission = field.admission;
      demand(admission?.kind === 'exponential', 'verification-failed', 'sum batch admission');
      for (let i = 0; i < active.length; i++) {
        ctx.tick(); ctx.allocate(3); components.push(Object.freeze({ group: active[i], exponent: admission.exponents[i], alias: admitted.aliases[i] }));
      }
      ctx.allocate(components.length); components.sort((a, b) => { ctx.tick(); return a.exponent < b.exponent ? -1 : a.exponent > b.exponent ? 1 : 0; });
    }
    const algebra = field ?? owner;
    let integrand = algebra.embed(ctx, normalization.rationalPart), exponential = algebra.fromInteger(ctx, 0n);
    for (const c of components) {
      ctx.tick(); integrand = algebra.add(ctx, integrand, algebra.multiply(ctx, algebra.embed(ctx, normalization.groups[c.group].coefficient), c.alias));
    }
    const solved: ExponentialSumSolvedComponent[] = []; ctx.allocate(1);
    let negative = false;
    for (let i = 0; i < components.length; i++) {
      ctx.tick(); const c = components[i], target = sumRdeTarget(ctx, owner, { field, components }, i);
      const rde = solveRationalRde(ctx, owner, target, normalization.groups[c.group].coefficient);
      ctx.allocate(3); solved.push(Object.freeze({ component: i, rde }));
      if (rde.kind === 'no-rational-solution') { negative = true; break; }
      demand(rde.solution !== null && rde.solution.homogeneous.length === 0, 'verification-failed', 'nonunique sum coefficient');
      exponential = algebra.add(ctx, exponential, algebra.multiply(ctx, algebra.embed(ctx, rde.solution.particular), c.alias));
    }
    let primitive: ExponentialSumPrimitive | null = null;
    if (!negative) {
      const variable = owner.fractions!.ring.variable; ctx.allocate(16);
      const domain = new FormalPrimitiveDomain(variable, variable === 'z' ? 'z1' : 'z');
      const rational = integrateRational(ctx, domain, toRationalPrimitiveInput(ctx, owner, domain, normalization.rationalPart));
      const derivative = differentiate(ctx, algebra, exponential);
      const assembledDerivative = algebra.add(ctx, derivative.derivative,
        algebra.embed(ctx, fromRationalPrimitiveInput(ctx, owner, domain, rational.derivative.derivative)));
      ctx.allocate(5); primitive = Object.freeze({ domain, rational, exponential, derivative, assembledDerivative });
    }
    ctx.allocate(12);
    const common = { owner, input, normalization, field, components: Object.freeze(components), solved: Object.freeze(solved),
      integrand, reduction: EXPONENTIAL_SUM_REDUCTION };
    const conditions = sumConditions(ctx, owner, { ...common, primitive });
    const decision: ExponentialSumDecision = primitive
      ? Object.freeze({ ...common, kind: 'elementary', primitive, conditions })
      : Object.freeze({ ...common, kind: 'non-elementary', primitive: null, conditions });
    verifySumWithin(ctx, owner, input, decision, bounds); return decision;
  });
}
