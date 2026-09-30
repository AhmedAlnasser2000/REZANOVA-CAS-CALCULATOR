import { demand, type ExecutionContext } from './execution';
import { assertDifferentialFieldOwner, checkDifferentialBounds, type DifferentialBounds, type DifferentialField, type DifferentialElement as E } from './differential-field';
import { verifyAdmission } from './differential-admission';
import { verifyDerivative } from './differential-derivative';
import { hyperexponentialVariable } from './hyperexponential-decision';
import { verifyRationalRde } from './rational-rde';
import { verifyRationalDecision } from './rational-decision';
import { fromRationalPrimitiveInput, toRationalPrimitiveInput } from './exponential-sum-bridge';
import { checkSumInput, sumUnsupported, verifySumNormalization } from './exponential-sum-normalization';
import { EXPONENTIAL_SUM_REDUCTION, type ExponentialSumInput, type ExponentialSumDecision, type ExponentialSumCondition } from './exponential-sum-types';

export function sumPower(ctx: ExecutionContext, field: DifferentialField, exponent: bigint): E {
  ctx.integer(exponent); let n = exponent < 0n ? ctx.multiply(exponent, -1n) : exponent;
  // Dense native fractions: establish the required degree before any power allocation.
  if (n > BigInt(ctx.limits.degree)) ctx.exhaust('degree');
  let out = field.fromInteger(ctx, 1n), power = field.generator(ctx);
  if (exponent < 0n) power = field.inverse(ctx, power);
  while (n) {
    ctx.tick(); if (ctx.remainder(n, 2n)) out = field.multiply(ctx, out, power);
    n = ctx.quotient(n, 2n); if (n) power = field.multiply(ctx, power, power);
  }
  return out;
}
export function sumRdeTarget(ctx: ExecutionContext, owner: DifferentialField, decision: Pick<ExponentialSumDecision, 'field' | 'components'>, index: number): E {
  const admission = decision.field?.admission;
  demand(admission?.kind === 'exponential', 'verification-failed', 'sum exponential admission');
  return owner.multiply(ctx, owner.fromInteger(ctx, decision.components[index].exponent), admission.derivative.derivative);
}
export function sumConditions(ctx: ExecutionContext, owner: DifferentialField, decision: Pick<ExponentialSumDecision,
  'input' | 'normalization' | 'primitive' | 'solved'>): readonly ExponentialSumCondition[] {
  const out: ExponentialSumCondition[] = []; ctx.allocate(1);
  const add = (kind: ExponentialSumCondition['kind'], index: number, value: E) => {
    ctx.allocate(4); out.push(Object.freeze({ kind, index, value }));
  };
  const denominator = (a: E) => {
    owner.assert(ctx, a); demand(a.kind === 'fraction', 'domain-mismatch', 'sum condition Q(x)');
    return owner.make(ctx, a.value.denominator.coefficients);
  };
  add('input-rational', 0, denominator(decision.input.rationalPart));
  for (let i = 0; i < decision.input.terms.length; i++) {
    ctx.tick(); add('input-coefficient', i, denominator(decision.input.terms[i].coefficient));
    add('input-argument', i, denominator(decision.input.terms[i].argument));
  }
  add('normalized-rational', 0, denominator(decision.normalization.rationalPart));
  if (decision.primitive) {
    const { domain, rational } = decision.primitive;
    const lift = (p: typeof rational.conditions.rationalDenominator) => fromRationalPrimitiveInput(ctx, owner, domain,
      domain.fractions.make(ctx, p, domain.x.one(ctx)));
    add('primitive-rational', 0, lift(rational.conditions.rationalDenominator));
    for (let i = 0; i < rational.conditions.logNorms.length; i++) { ctx.tick(); add('primitive-log-norm', i, lift(rational.conditions.logNorms[i])); }
    for (const s of decision.solved) {
      ctx.tick(); demand(s.rde.solution !== null, 'verification-failed', 'sum primitive solution condition');
      add('primitive-coefficient', s.component, denominator(s.rde.solution.particular));
    }
  }
  return Object.freeze(out);
}
function sameInput(ctx: ExecutionContext, owner: DifferentialField, expected: ExponentialSumInput, stored: ExponentialSumInput): void {
  checkSumInput(ctx, owner, stored);
  demand(expected.terms.length === stored.terms.length && owner.equal(ctx, expected.rationalPart, stored.rationalPart),
    'verification-failed', 'sum expected input');
  for (let i = 0; i < expected.terms.length; i++) {
    ctx.tick(); demand(owner.equal(ctx, expected.terms[i].argument, stored.terms[i].argument)
      && owner.equal(ctx, expected.terms[i].coefficient, stored.terms[i].coefficient), 'verification-failed', 'sum original ordered input');
  }
}
export function verifySumWithin(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialSumInput,
  decision: ExponentialSumDecision, bounds: DifferentialBounds): void {
  checkDifferentialBounds(ctx, bounds); checkSumInput(ctx, owner, input);
  demand(decision.owner === owner && decision.reduction === EXPONENTIAL_SUM_REDUCTION
    && (decision.kind === 'elementary' || decision.kind === 'non-elementary'), 'verification-failed', 'sum decision owner/rule');
  sameInput(ctx, owner, input, decision.input);
  const active = verifySumNormalization(ctx, owner, input, decision.normalization);
  demand(!sumUnsupported(ctx, owner, decision.normalization, active), 'verification-failed', 'sum unsupported argument');
  demand(Array.isArray(decision.components) && decision.components.length === active.length, 'verification-failed', 'sum component coverage');
  const field = decision.field ?? owner;
  if (active.length) {
    assertDifferentialFieldOwner(ctx, field);
    demand(field.parent === owner && field.kind === 'formal' && field.constantField === 'Q'
      && field.fractions!.ring.variable === hyperexponentialVariable(owner) && field.admission?.kind === 'exponential',
    'verification-failed', 'sum certified field');
    if (field.height > bounds.towerHeight) ctx.exhaust('tower-height');
    const admission = field.admission; verifyAdmission(ctx, field, admission);
    demand(admission.arguments.length === active.length && admission.exponents.length === active.length,
      'verification-failed', 'sum admission coverage');
    ctx.allocate(decision.normalization.groups.length);
    const positions = new Map<number, number>();
    for (let j = 0; j < active.length; j++) {
      ctx.tick(); positions.set(active[j], j);
      demand(owner.equal(ctx, admission.arguments[j], decision.normalization.groups[active[j]].argument),
        'verification-failed', 'sum original admitted argument');
    }
    for (let i = 0; i < decision.components.length; i++) {
      ctx.tick(); const c = decision.components[i], j = positions.get(c.group);
      demand(j !== undefined && Number.isSafeInteger(c.group), 'verification-failed', 'sum component group'); positions.delete(c.group);
      ctx.integer(c.exponent);
      demand(c.exponent !== 0n && c.exponent === admission.exponents[j]
        && (i === 0 || decision.components[i - 1].exponent < c.exponent), 'verification-failed', 'sum component exponent order');
      demand(field.equal(ctx, c.alias, sumPower(ctx, field, c.exponent)), 'verification-failed', 'sum component alias');
    }
    demand(positions.size === 0, 'verification-failed', 'missing sum component');
  } else demand(decision.field === null, 'verification-failed', 'pure rational sum field');
  let integrand = field.embed(ctx, decision.normalization.rationalPart), exponential = field.fromInteger(ctx, 0n);
  for (const c of decision.components) {
    ctx.tick(); integrand = field.add(ctx, integrand, field.multiply(ctx,
      field.embed(ctx, decision.normalization.groups[c.group].coefficient), c.alias));
  }
  demand(field.equal(ctx, integrand, decision.integrand), 'verification-failed', 'sum assembled input');
  demand(Array.isArray(decision.solved) && decision.solved.length <= decision.components.length,
    'verification-failed', 'sum solved coverage');
  const positive = decision.kind === 'elementary';
  demand(positive ? decision.solved.length === decision.components.length : decision.solved.length > 0,
    'verification-failed', 'sum outcome coverage');
  for (let i = 0; i < decision.solved.length; i++) {
    ctx.tick(); const solved = decision.solved[i], component = decision.components[i];
    demand(solved.component === i, 'verification-failed', 'sum solved prefix');
    verifyRationalRde(ctx, owner, sumRdeTarget(ctx, owner, decision, i), decision.normalization.groups[component.group].coefficient, solved.rde);
    if (!positive && i === decision.solved.length - 1) {
      demand(solved.rde.kind === 'no-rational-solution', 'verification-failed', 'sum obstruction');
    } else {
      demand(solved.rde.kind === 'solutions' && solved.rde.solution !== null && solved.rde.solution.homogeneous.length === 0,
        'verification-failed', 'sum unique coefficient solution');
      exponential = field.add(ctx, exponential, field.multiply(ctx, field.embed(ctx, solved.rde.solution.particular), component.alias));
    }
  }
  if (positive) {
    const p = decision.primitive;
    demand(p !== null, 'verification-failed', 'missing sum primitive');
    const rationalInput = toRationalPrimitiveInput(ctx, owner, p.domain, decision.normalization.rationalPart);
    demand(p.domain.z.variable === (owner.fractions!.ring.variable === 'z' ? 'z1' : 'z'),
      'verification-failed', 'sum rational residue variable');
    verifyRationalDecision(ctx, p.domain, rationalInput, p.rational);
    demand(field.equal(ctx, exponential, p.exponential), 'verification-failed', 'sum exponential primitive assembly');
    verifyDerivative(ctx, field, p.exponential, p.derivative);
    const rationalDerivative = fromRationalPrimitiveInput(ctx, owner, p.domain, p.rational.derivative.derivative);
    const complete = field.add(ctx, field.embed(ctx, rationalDerivative), p.derivative.derivative);
    demand(field.equal(ctx, complete, p.assembledDerivative) && field.equal(ctx, complete, integrand),
      'verification-failed', 'sum complete derivative');
  } else demand(decision.primitive === null, 'verification-failed', 'negative sum primitive');
  const conditions = sumConditions(ctx, owner, decision);
  demand(Array.isArray(decision.conditions) && conditions.length === decision.conditions.length, 'verification-failed', 'sum condition coverage');
  for (let i = 0; i < conditions.length; i++) {
    ctx.tick(); const a = conditions[i], b = decision.conditions[i];
    demand(a.kind === b.kind && a.index === b.index && owner.equal(ctx, a.value, b.value), 'verification-failed', 'sum retained condition');
  }
}
