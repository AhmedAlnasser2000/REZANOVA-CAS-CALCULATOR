import { demand, type ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import type { DifferentialElement as E, DifferentialField } from '../../symbolic-engine/integration/core/differential-field';
import type { ExponentialClassification, ExponentialExpression as X, ExponentialNormalizationInput } from '../../symbolic-engine/integration/core/exponential-normalization-types';
import { normalizeExponentialExpression } from '../../symbolic-engine/integration/core/exponential-normalization';
import { decodeExponentialNormalization, encodeExponentialNormalization } from '../../symbolic-engine/integration/core/exponential-normalization-wire';
import { INTEGRATION_BOUNDS } from './exponential-lowering';

const rational = (value: E): X => ({kind: 'rational', value});
function terms(base: DifferentialField, ctx: ExecutionContext, argument: E, values: readonly {power: bigint; coefficient: E}[]): X {
  return values.reduce<X>((left, item) => ({kind: 'add', left, right: {kind: 'multiply', left: rational(item.coefficient),
    right: {kind: 'power', value: {kind: 'exponential', value: argument}, exponent: item.power}}}), rational(base.fromInteger(ctx, 0n)));
}
export function normalizedExpression(ctx: ExecutionContext, base: DifferentialField, c: ExponentialClassification): X {
  demand(c.kind !== 'unsupported', 'verification-failed', 'unsupported correspondence');
  if (c.kind === 'rational') return rational(c.value);
  return {kind: 'divide', left: terms(base, ctx, c.argument, c.numerator), right: terms(base, ctx, c.argument, c.denominator)};
}
/** Native exponential field represented by its complete admitted argument, not its derivative. */
export function nativeExpression(ctx: ExecutionContext, base: DifferentialField, value: E): X {
  if (value.owner === base) return rational(value);
  const field = value.owner;
  demand(field.parent === base && field.admission?.kind === 'exponential' && value.kind === 'fraction', 'domain-mismatch', 'correspondence field');
  const polynomial = (cs: readonly E[]) => terms(base, ctx, field.admission!.argument, cs.map((coefficient, i) => ({coefficient, power: BigInt(i)})));
  return {kind: 'divide', left: polynomial(value.value.numerator.coefficients), right: polynomial(value.value.denominator.coefficients)};
}
export function correspondenceInput(ctx: ExecutionContext, base: DifferentialField, classification: ExponentialClassification, target: E): ExponentialNormalizationInput {
  ctx.allocate(4);
  return {expression: {kind: 'subtract', left: normalizedExpression(ctx, base, classification), right: nativeExpression(ctx, base, target)}, restrictions: []};
}
function requireZero(ctx: ExecutionContext, base: DifferentialField, c: ExponentialClassification) {
  demand(c.kind === 'rational' && base.isZero(ctx, c.value), 'verification-failed', 'saved integrand differs from current problem');
}
export function produceCorrespondence(ctx: ExecutionContext, base: DifferentialField, classification: ExponentialClassification, target: E): unknown {
  const input = correspondenceInput(ctx, base, classification, target);
  const proof = normalizeExponentialExpression(ctx, base, input, INTEGRATION_BOUNDS);
  requireZero(ctx, base, proof.classification);
  return encodeExponentialNormalization(ctx, base, input, proof, INTEGRATION_BOUNDS);
}
export function replayCorrespondence(ctx: ExecutionContext, base: DifferentialField, classification: ExponentialClassification, target: E, data: unknown): void {
  const input = correspondenceInput(ctx, base, classification, target);
  const proof = decodeExponentialNormalization(ctx, base, input, data, INTEGRATION_BOUNDS);
  requireZero(ctx, base, proof.classification);
}
