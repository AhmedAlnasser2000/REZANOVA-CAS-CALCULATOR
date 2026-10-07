import { demand, type ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import type { DifferentialField, DifferentialElement as E } from '../../symbolic-engine/integration/core/differential-field';
import { buildExponential } from '../../symbolic-engine/integration/core/differential-admission';
import type { ExponentialClassification, ExponentialPowerTerm } from '../../symbolic-engine/integration/core/exponential-normalization-types';
import { toRationalPrimitiveInput } from '../../symbolic-engine/integration/core/exponential-sum-bridge';
import type { FormalPrimitiveDomain } from '../../symbolic-engine/integration/core/formal-primitive';
import { INTEGRATION_BOUNDS } from './exponential-lowering';
import { UnsupportedIntegral } from './lowering';

export function fieldPower(ctx: ExecutionContext, field: DifferentialField, value: E, exponent: bigint): E {
  field.assert(ctx, value); ctx.integer(exponent);
  let n = exponent < 0n ? -exponent : exponent, base = exponent < 0n ? field.inverse(ctx, value) : value;
  let out = field.fromInteger(ctx, 1n);
  while (n) {ctx.tick(); if (n % 2n) out = field.multiply(ctx, out, base); n /= 2n; if (n) base = field.multiply(ctx, base, base);}
  return out;
}
export function classifiedFieldInput(ctx: ExecutionContext, field: DifferentialField, alias: E,
  classification: Extract<ExponentialClassification, {kind: 'exponential'}>): E {
  demand(field.parent === classification.argument.owner, 'domain-mismatch', 'normalized coefficient binding');
  const polynomial = (terms: readonly ExponentialPowerTerm[]) => terms.reduce((sum, term) => {
    ctx.tick(); return field.add(ctx, sum, field.multiply(ctx, field.embed(ctx, term.coefficient), fieldPower(ctx, field, alias, term.power)));
  }, field.fromInteger(ctx, 0n));
  return field.exactDivide(ctx, polynomial(classification.numerator), polynomial(classification.denominator));
}
export function constructExecutionInput(ctx: ExecutionContext, base: DifferentialField, native: FormalPrimitiveDomain, classification: ExponentialClassification) {
  if (classification.kind === 'unsupported') throw new UnsupportedIntegral(classification.reason === 'independent-families'
    ? 'The surviving expression uses independent exponential families. Their broader decision procedure is not supported yet.'
    : 'The surviving expression requires a constant extension, which is not supported yet.');
  if (classification.kind === 'rational') return {kind: 'rational' as const, owner: native, input: toRationalPrimitiveInput(ctx, base, native, classification.value)};
  const used = new Set([base.fractions!.ring.variable]); let name = 't'; while (used.has(name)) name += '_1';
  const admission = buildExponential(ctx, base, name, [classification.argument], INTEGRATION_BOUNDS);
  demand(admission.status === 'supported' && admission.aliases.length === 1, 'verification-failed', 'normalized exponential admission');
  return {kind: 'exponential' as const, owner: admission.field, input: classifiedFieldInput(ctx, admission.field, admission.aliases[0], classification)};
}
