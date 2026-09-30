import { demand, type ExecutionContext } from './execution';
import { DifferentialField, assertDifferentialFieldOwner, checkDifferentialBounds, type DifferentialBounds, type DifferentialElement as E } from './differential-field';
import { buildExponential, requireRationalVariable, scalarValue, verifyAdmission } from './differential-admission';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { solveRationalRde, verifyRationalRde, type RationalRdeDecision } from './rational-rde';
import type { Polynomial as P } from './polynomial';

/** Fixed theorem rule, not a trusted status flag. See the gate specification. */
export const HYPEREXPONENTIAL_REDUCTION = 'rational-exponential-liouville-v1' as const;
export interface HyperexponentialConditions {
  readonly coefficientDenominator: P<E>;
  readonly exponentDenominator: P<E>;
  readonly primitiveCoefficientDenominator: P<E> | null;
}
interface Common {
  readonly owner: DifferentialField;
  readonly b: E;
  readonly r: E;
  readonly field: DifferentialField;
  readonly alias: E;
  readonly integrand: E;
  readonly exponentDerivative: DerivativeEvidence;
  readonly rde: RationalRdeDecision;
  readonly reduction: typeof HYPEREXPONENTIAL_REDUCTION;
  readonly conditions: HyperexponentialConditions;
}
export type HyperexponentialDecision = Readonly<Common & (
  { kind: 'elementary'; primitive: Readonly<{ coefficient: E; value: E; derivative: DerivativeEvidence }> }
  | { kind: 'non-elementary'; primitive: null }
)>;
export type HyperexponentialResult = HyperexponentialDecision | Readonly<{ kind: 'unsupported'; reason: 'constant-exponent' }>;

export function hyperexponentialVariable(owner: DifferentialField): string {
  return owner.fractions!.ring.variable === 'h' ? 'h1' : 'h';
}
function denominator(ctx: ExecutionContext, owner: DifferentialField, value: E): P<E> {
  owner.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'hyperexponential rational input');
  return value.value.denominator;
}
function inputs(ctx: ExecutionContext, owner: DifferentialField, b: E, r: E): void {
  assertDifferentialFieldOwner(ctx, owner); requireRationalVariable(ctx, owner); owner.assert(ctx, b); owner.assert(ctx, r);
}
function verify(ctx: ExecutionContext, owner: DifferentialField, b: E, r: E, e: HyperexponentialDecision): void {
  inputs(ctx, owner, b, r);
  demand(scalarValue(ctx, owner, r) === undefined, 'invalid-input', 'constant exponent has no hyperexponential decision');
  demand(e.owner === owner && owner.equal(ctx, b, e.b) && owner.equal(ctx, r, e.r), 'verification-failed', 'hyperexponential expected inputs');
  demand(e.reduction === HYPEREXPONENTIAL_REDUCTION && (e.kind === 'elementary' || e.kind === 'non-elementary'),
    'verification-failed', 'hyperexponential reduction rule');
  const field = e.field; assertDifferentialFieldOwner(ctx, field);
  demand(field instanceof DifferentialField && field.parent === owner && field.kind === 'formal'
    && field.constantField === 'Q' && field.admission?.kind === 'exponential'
    && field.fractions!.ring.variable === hyperexponentialVariable(owner), 'verification-failed', 'hyperexponential certified field');
  const admission = field.admission;
  verifyAdmission(ctx, field, admission);
  demand(admission.arguments.length === 1 && admission.exponents.length === 1
    && owner.equal(ctx, admission.arguments[0], r)
    && (admission.exponents[0] === 1n || admission.exponents[0] === -1n), 'verification-failed', 'hyperexponential original exponent');
  const t = field.generator(ctx), alias = admission.exponents[0] === 1n ? t : field.inverse(ctx, t);
  demand(field.equal(ctx, alias, e.alias), 'verification-failed', 'hyperexponential alias');
  demand(field.equal(ctx, e.integrand, field.multiply(ctx, field.embed(ctx, b), alias)), 'verification-failed', 'hyperexponential integrand');
  verifyDerivative(ctx, owner, r, e.exponentDerivative);
  verifyRationalRde(ctx, owner, e.exponentDerivative.derivative, b, e.rde);
  const ring = owner.fractions!.ring, conditions = e.conditions;
  demand(ring.equal(ctx, conditions.coefficientDenominator, denominator(ctx, owner, b))
    && ring.equal(ctx, conditions.exponentDenominator, denominator(ctx, owner, r)), 'verification-failed', 'hyperexponential input conditions');
  if (e.kind === 'non-elementary') {
    // The admission holds over C(x) too. The RDE bounds cover C(x), and its
    // rational inconsistency witness stays contradictory after extending constants.
    demand(e.rde.kind === 'no-rational-solution' && e.primitive === null && conditions.primitiveCoefficientDenominator === null,
      'verification-failed', 'hyperexponential negative certificate'); return;
  }
  demand(e.rde.kind === 'solutions' && e.rde.solution !== null && e.rde.solution.homogeneous.length === 0,
    'verification-failed', 'hyperexponential unique rational coefficient');
  const primitive = e.primitive;
  demand(owner.equal(ctx, primitive.coefficient, e.rde.solution.particular), 'verification-failed', 'hyperexponential coefficient mapping');
  demand(field.equal(ctx, primitive.value, field.multiply(ctx, field.embed(ctx, primitive.coefficient), alias)),
    'verification-failed', 'hyperexponential primitive assembly');
  verifyDerivative(ctx, field, primitive.value, primitive.derivative);
  demand(field.equal(ctx, primitive.derivative.derivative, e.integrand), 'verification-failed', 'hyperexponential final derivative');
  demand(conditions.primitiveCoefficientDenominator !== null
    && ring.equal(ctx, conditions.primitiveCoefficientDenominator, denominator(ctx, owner, primitive.coefficient)),
    'verification-failed', 'hyperexponential primitive condition');
}
export function verifyHyperexponentialDecision(ctx: ExecutionContext, owner: DifferentialField, b: E, r: E,
  decision: HyperexponentialDecision): void {
  ctx.operation(() => verify(ctx, owner, b, r, decision));
}
export function integrateHyperexponential(ctx: ExecutionContext, owner: DifferentialField, b: E, r: E,
  bounds: DifferentialBounds): HyperexponentialResult {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); inputs(ctx, owner, b, r);
    if (scalarValue(ctx, owner, r) !== undefined) { ctx.allocate(2); return Object.freeze({ kind: 'unsupported', reason: 'constant-exponent' }); }
    ctx.allocate(1); const admitted = buildExponential(ctx, owner, hyperexponentialVariable(owner), [r], bounds);
    demand(admitted.status === 'supported', 'verification-failed', 'nonconstant rational exponent admission');
    const field = admitted.field, alias = admitted.aliases[0], exponentDerivative = differentiate(ctx, owner, r);
    const rde = solveRationalRde(ctx, owner, exponentDerivative.derivative, b);
    const integrand = field.multiply(ctx, field.embed(ctx, b), alias);
    ctx.allocate(16);
    const common = { owner, b, r, field, alias, integrand, exponentDerivative, rde, reduction: HYPEREXPONENTIAL_REDUCTION };
    const cs = { coefficientDenominator: denominator(ctx, owner, b), exponentDenominator: denominator(ctx, owner, r) };
    let decision: HyperexponentialDecision;
    if (rde.kind === 'solutions') {
      demand(rde.solution !== null && rde.solution.homogeneous.length === 0, 'verification-failed', 'nonunique hyperexponential coefficient');
      const coefficient = rde.solution.particular, value = field.multiply(ctx, field.embed(ctx, coefficient), alias);
      ctx.allocate(6);
      decision = Object.freeze({ ...common, kind: 'elementary',
        primitive: Object.freeze({ coefficient, value, derivative: differentiate(ctx, field, value) }),
        conditions: Object.freeze({ ...cs, primitiveCoefficientDenominator: denominator(ctx, owner, coefficient) }) });
    } else decision = Object.freeze({ ...common, kind: 'non-elementary', primitive: null,
      conditions: Object.freeze({ ...cs, primitiveCoefficientDenominator: null }) });
    verify(ctx, owner, b, r, decision); return decision;
  });
}
