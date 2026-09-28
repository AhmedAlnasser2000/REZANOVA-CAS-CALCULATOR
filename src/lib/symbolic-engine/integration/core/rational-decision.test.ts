import { describe, expect, it } from 'vitest';
import { context, poly } from './test-support';
import { FormalPrimitiveDomain } from './formal-primitive';
import { integrateRational } from './rational-decision';

describe('automatic rational integration', () => {
  const fixtures = [
    ['zero', [0], [1]], ['constant', [3], [1]], ['improper', [1, 0, 1], [-1, 1]],
    ['repeated irreducible', [1], [1, 0, 2, 0, 1]],
    ['quadratic', [1], [1, 0, 1]], ['repeated residue', [0, 1], [-1, 0, 1]],
    ['quartic', [1], [1, 0, 0, 0, 1]], ['quintic logarithmic', [-1, 0, 0, 0, 5], [-1, -1, 0, 0, 0, 1]],
    ['quintic', [1], [-1, -1, 0, 0, 0, 1]], ['degree loss', [2, -8, 3], [0, 2, -3, 1]],
  ] as const;
  for (const [name, numerator, denominator] of fixtures) it(name, () => {
    const ctx = context({ work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256 });
    const owner = new FormalPrimitiveDomain('x', 'z');
    const input = owner.fractions.make(ctx, poly(ctx, owner.x, [...numerator]), poly(ctx, owner.x, [...denominator]));
    const start = performance.now(), decision = integrateRational(ctx, owner, input);
    expect(owner.fractions.equal(ctx, decision.derivative.derivative, input)).toBe(true);
    console.info(name, ctx.usage, `${Math.round(performance.now() - start)}ms`);
  }, 120000);
});
