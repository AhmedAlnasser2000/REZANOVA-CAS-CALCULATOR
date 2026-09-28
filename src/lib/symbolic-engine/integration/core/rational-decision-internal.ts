import { demand, type ExecutionContext } from './execution';
import type { FormalPrimitive, FormalPrimitiveDomain, PrimitiveConditions, QPolynomial, QRationalFunction } from './formal-primitive';
import { hermiteReduce, verifyHermite, type HermiteCertificate } from './hermite-reduction';
import { lrtReduce, verifyLrt, type LrtCertificate } from './lrt-reduction';
import { verifyPrimitiveWithin, verifyPrimitiveDerivativeWithin, type PrimitiveDerivativeCertificate } from './primitive-verification-internal';

export interface DecisionConditions extends PrimitiveConditions { readonly inputDenominator: QPolynomial }
export interface RationalDecision {
  readonly input: QRationalFunction;
  readonly primitive: FormalPrimitive;
  readonly hermite: HermiteCertificate;
  readonly lrt: LrtCertificate | null;
  readonly derivative: PrimitiveDerivativeCertificate;
  readonly conditions: DecisionConditions;
}
export function integrateRationalWithin(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction): RationalDecision {
  owner.fractions.assert(ctx, input);
  const hermite = hermiteReduce(ctx, owner, input);
  const lrt = owner.fractions.isZero(ctx, hermite.residual) ? null : lrtReduce(ctx, owner, hermite.residual);
  const terms = []; // Preserve factor-first component order.
  for (const group of lrt?.groups ?? []) for (const component of group.components) { ctx.allocate(1); terms.push(component.term); }
  const primitive = owner.make(ctx, hermite.rationalPart, terms);
  const derivative = verifyPrimitiveWithin(ctx, primitive, input);
  ctx.allocate(10);
  const conditions = Object.freeze({ ...primitive.conditions, inputDenominator: input.denominator });
  const decision = Object.freeze({ input, primitive, hermite, lrt, derivative, conditions });
  verifyRationalDecisionWithin(ctx, owner, input, decision); return decision;
}
/** Replays supplied evidence. Does not invoke Hermite or LRT producers. */
export function verifyRationalDecisionWithin(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, decision: RationalDecision): void {
  owner.fractions.assert(ctx, input); owner.assert(ctx, decision.primitive);
  demand(owner.fractions.equal(ctx, input, decision.input), 'verification-failed', 'decision input mismatch');
  verifyHermite(ctx, owner, input, decision.hermite);
  demand(owner.fractions.equal(ctx, decision.primitive.rationalPart, decision.hermite.rationalPart), 'verification-failed', 'decision rational primitive');
  let index = 0;
  if (owner.fractions.isZero(ctx, decision.hermite.residual)) demand(decision.lrt === null, 'verification-failed', 'zero residual must omit LRT');
  else {
    demand(decision.lrt !== null, 'verification-failed', 'missing LRT'); verifyLrt(ctx, owner, decision.hermite.residual, decision.lrt);
    for (const group of decision.lrt.groups) for (const component of group.components) {
      ctx.tick(); demand(decision.primitive.terms[index++] === component.term, 'verification-failed', 'primitive component coverage/order');
    }
  }
  demand(index === decision.primitive.terms.length, 'verification-failed', 'extra primitive terms');
  demand(owner.x.equal(ctx, decision.conditions.inputDenominator, input.denominator), 'verification-failed', 'input denominator condition');
  owner.verifyConditions(ctx, decision.primitive, decision.conditions);
  verifyPrimitiveDerivativeWithin(ctx, decision.primitive, input, decision.derivative);
}
