import type {ExecutionContext} from '../execution';
import {DifferentialField, type DifferentialElement as E} from '../differential-field';
import {CertifiedTowerView} from '../recursive-certified-tower';
import {differentiateWithin} from '../differential-derivative';
import {certifyStructuredDifferentialExtensionWithin} from '../structured-differential-admission';
import {bounds} from '../differential-test-support';

export type CompactTowerFixture = 'rational' | 'mixed-log' | 'mixed-exp' | 'nested-log' | 'recursive-root' | 'height-eight';
export function compactTowerFixture(ctx: ExecutionContext, kind: CompactTowerFixture) {
  return ctx.operation(() => {
    const q = DifferentialField.rationals(ctx, bounds), base = DifferentialField.rationalFunctions(ctx, q, 'x', bounds), x = base.generator(ctx);
    let view = CertifiedTowerView.rationalFunctions(ctx, base, bounds); const ancestors: CertifiedTowerView[] = [];
    const height = kind === 'rational' ? 1 : kind === 'height-eight' ? 8 : 3;
    for (let level = 2; level <= height; level++) {
      const logarithm = kind === 'nested-log' || kind === 'mixed-log' && level === 2 || (kind === 'mixed-exp' || kind === 'recursive-root') && level === 3 || kind === 'height-eight' && level % 2 === 0;
      const parent = view, f = parent.owner;
      let argument: E;
      if (kind === 'nested-log') argument = parent.owner.generator(ctx);
      else if (kind === 'height-eight') {
        const k = level - 1; ctx.allocate(logarithm ? 2 : k + 1);
        const coefficients = logarithm ? [q.fromInteger(ctx, BigInt(k)), q.fromInteger(ctx, 1n)]
          : Array.from({length: k + 1}, (_, i) => q.fromInteger(ctx, i === k ? 1n : 0n));
        argument = f.embed(ctx, base.make(ctx, coefficients));
      } else argument = f.embed(ctx, x);
      const derivative = differentiateWithin(ctx, f, argument).derivative, rate = logarithm ? f.exactDivide(ctx, derivative, argument) : derivative;
      const owner = DifferentialField.formal(ctx, f, `t${level - 1}`, logarithm ? [rate] : [f.fromInteger(ctx, 0n), rate], bounds);
      const admission = certifyStructuredDifferentialExtensionWithin(ctx, parent, owner, {kind: logarithm ? 'logarithm' : 'exponential', argument}, bounds);
      if (admission.kind !== 'admitted') throw Error('known independent compact tower'); ctx.allocate(1); ancestors.push(admission.view); view = admission.view;
    }
    const f = view.owner, t = f.generator(ctx); let input: E;
    if (kind === 'rational') input = base.make(ctx, [q.fromInteger(ctx, 1n)], [q.fromInteger(ctx, 1n), q.fromInteger(ctx, 0n), q.fromInteger(ctx, 1n)]);
    else if (kind === 'height-eight') input = f.multiply(ctx, f.embed(ctx, view.rate!), t);
    else if (kind === 'nested-log') input = f.exactDivide(ctx, f.embed(ctx, view.rate!), t);
    else if (kind === 'recursive-root') input = f.exactDivide(ctx, f.multiply(ctx, f.fromInteger(ctx, 2n), f.multiply(ctx, f.embed(ctx, view.rate!), t)), f.add(ctx, f.multiply(ctx, t, t), f.fromInteger(ctx, 1n)));
    else {
      const s = f.embed(ctx, ancestors[0].owner.generator(ctx)), inverseX = f.inverse(ctx, f.embed(ctx, x));
      input = kind === 'mixed-log' ? f.multiply(ctx, t, f.add(ctx, s, inverseX)) : f.multiply(ctx, s, f.add(ctx, t, inverseX));
    }
    return Object.freeze({view, input});
  });
}
