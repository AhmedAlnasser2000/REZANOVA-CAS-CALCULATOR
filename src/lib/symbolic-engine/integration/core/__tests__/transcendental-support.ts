import { setup, bounds } from '../differential-test-support';
import { ExecutionContext } from '../execution';
import { DifferentialField, type DifferentialElement as E } from '../differential-field';
import { CertifiedTowerView } from '../recursive-certified-tower';
import { certifyRecursiveDifferentialExtension } from '../recursive-differential-admission';
import { differentiate } from '../differential-derivative';
export { setup, bounds };
export const fresh = () => new ExecutionContext({work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256});
export function extend(ctx: ExecutionContext, parent: CertifiedTowerView, kind: 'logarithm' | 'exponential', argument: E, name: string): CertifiedTowerView {
  const d = differentiate(ctx, parent.owner, argument).derivative, eta = kind === 'logarithm' ? parent.owner.exactDivide(ctx, d, argument) : d;
  const owner = DifferentialField.formal(ctx, parent.owner, name, kind === 'logarithm' ? [eta] : [parent.owner.fromInteger(ctx, 0n), eta], bounds);
  const e = certifyRecursiveDifferentialExtension(ctx, parent, owner, {kind, argument}, bounds);
  if (e.kind !== 'admitted') throw Error('dependent test construction'); return e.view;
}
export function mixed(logFirst = true) {
  const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds);
  const first = extend(s.ctx, root, logFirst ? 'logarithm' : 'exponential', s.x, 's');
  const view = extend(s.ctx, first, logFirst ? 'exponential' : 'logarithm', first.owner.embed(s.ctx, s.x), 't');
  return {...s, root, first, view, owner: view.owner};
}
