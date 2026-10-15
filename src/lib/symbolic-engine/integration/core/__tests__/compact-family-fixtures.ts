import type {ExecutionContext} from '../execution';
import {compactTowerFixture} from './transcendental-compact-fixtures';

export type CompactFamilyFixture = 'rde-resonance' | 'rde-negative' | 'limited-mixed' | 'limited-negative';
export function compactFamilyFixture(ctx: ExecutionContext, kind: CompactFamilyFixture) {
  return ctx.operation(() => {
    const negative = kind.endsWith('negative'), base = compactTowerFixture(ctx, negative ? 'mixed-exp' : 'mixed-log'), f = base.view.owner, zero = f.fromInteger(ctx, 0n), t = f.generator(ctx);
    let x = base.view; while (x.parent !== null) {ctx.tick(); x = x.parent;}
    const b = negative ? f.inverse(ctx, f.multiply(ctx, f.embed(ctx, x.owner.generator(ctx)), t)) : kind === 'rde-resonance' ? zero : base.input;
    ctx.allocate(8); return Object.freeze({view: base.view, a: f.fromInteger(ctx, kind === 'rde-resonance' ? -1n : 0n), b,
      forcing: kind === 'rde-resonance' ? Object.freeze([t, t, zero]) : Object.freeze([]), negative});
  });
}
