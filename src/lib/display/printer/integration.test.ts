import { expect, it } from 'vitest';
import { presentIntegrationMath } from './integration';
import { ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import { FormalPrimitiveDomain } from '../../symbolic-engine/integration/core/formal-primitive';
import { treeFraction } from '../../calculus/new-integration/exact-math';
import type { SerializableMathJson } from '../../../types/calculator';
const num = (n: string): SerializableMathJson => ({num: n});
it('removes structural clutter, sorts polynomial powers, preserves subscripts and exact digits', () => {
  const p = presentIntegrationMath(['Add', 2, ['Multiply', 12, 'a_1'], ['Multiply', 0, 'y'], ['Multiply', 1, ['Power', 'y', 4]]], ['y', 'a_1']);
  expect(p.latex).toBe('y^{4}+12\\cdot a_{1}+2');
  expect(presentIntegrationMath(num('-900719925474099312345')).latex).toBe('-900\\,719\\,925\\,474\\,099\\,312\\,345');
  expect(presentIntegrationMath(['Add', 'x', ['Add', -2, ['Multiply', -3, 'a']]], ['x', 'a']).latex).toBe('x-3\\cdot a-2');
  expect(presentIntegrationMath(['Add', 'x', ['Multiply', -1, ['Power', 'x', 2]]], ['x']).latex).toBe('-x^{2}+x');
  expect(presentIntegrationMath(['Divide', ['Divide', 1, 3], ['Add', 1, 'x']], ['x']).latex).toBe('\\frac{\\frac{1}{3}}{x+1}');
});
it('preserves exact rational identities through signed nesting and seeded trees without mutating operands', () => {
  const ctx = new ExecutionContext({work: 20000000, allocation: 100000000, integerBits: 2048, degree: 256});
  const o = new FormalPrimitiveDomain('x', 'z');
  const fixtures: SerializableMathJson[] = [
    ['Add', 'x', ['Negate', ['Add', 'x', 2]]], ['Multiply', -2, ['Negate', ['Add', 'x', 1]]],
    ['Divide', ['Negate', ['Add', 'x', 1]], -3], ['Power', ['Negate', ['Add', 'x', 1]], 3],
    ['Power', ['Multiply', -1, 'x'], 2], ['Negate', ['Negate', ['Add', 'x', 3]]],
  ];
  let seed = 173;
  for (let i = 0; i < 30; i++) {seed = (seed * 16807) % 2147483647; fixtures.push(['Add', ['Multiply', (seed % 19) - 9, ['Power', 'x', i % 5]], ['Negate', ['Add', 'x', i]], 0]);}
  for (const tree of fixtures) {
    const before = JSON.stringify(tree), p = presentIntegrationMath(tree, ['x']);
    expect(o.fractions.equal(ctx, treeFraction(ctx, o, tree), treeFraction(ctx, o, JSON.parse(p.key)))).toBe(true);
    expect(JSON.stringify(tree)).toBe(before);
  }
});
it('bounds input and generated notation and never evaluates unknown constants', () => {
  expect(() => presentIntegrationMath(['Add', 1, 'x'], ['x'], {maxNodes: 1})).toThrow();
  expect(() => presentIntegrationMath(num('123456789'.repeat(7)), [], {maxBytes: 75})).toThrow();
  expect(presentIntegrationMath(['Add', 1, -1]).nonzeroConstant).toBe(false);
  expect(presentIntegrationMath(['Divide', -2, 3]).nonzeroConstant).toBe(true);
  expect(() => presentIntegrationMath(['Sin', 'x'])).toThrow();
});
