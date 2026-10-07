import {demand, type ExecutionContext} from '../../symbolic-engine/integration/core/execution';
import type {DifferentialElement as E} from '../../symbolic-engine/integration/core/differential-field';
import type {IntegrationSourceProof} from './normalization-result';
import {replayCorrespondence} from './correspondence';
import {verifyExponentialNormalization} from '../../symbolic-engine/integration/core/exponential-normalization';
import {classifiedFieldInput} from './execution-input';

/** A restriction ledger must belong to the verified source of this exact decision target. */
export function checkSourceTarget(ctx: ExecutionContext, source: IntegrationSourceProof, target: E): void {
  verifyExponentialNormalization(ctx, source.owner, source.input, source.normalization, source.bounds);
  const base = source.owner, c = source.normalization.classification;
  if (source.correspondence !== undefined) {replayCorrespondence(ctx, base, c, target, source.correspondence); return;}
  if (c.kind === 'rational') {
    demand(target.owner === base && base.equal(ctx, target, c.value), 'verification-failed', 'rational source target'); return;
  }
  demand(c.kind === 'exponential' && target.owner.parent === base && target.owner.admission?.kind === 'exponential', 'verification-failed', 'exponential source target');
  const field = target.owner, argument = field.admission!.argument;
  let alias = field.generator(ctx);
  if (!base.equal(ctx, argument, c.argument)) {
    demand(base.equal(ctx, base.negate(ctx, argument), c.argument), 'verification-failed', 'source exponent correspondence required');
    alias = field.inverse(ctx, alias);
  }
  demand(field.equal(ctx, target, classifiedFieldInput(ctx, field, alias, c)), 'verification-failed', 'source exact target');
}
