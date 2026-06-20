import { describe, expect, it } from 'vitest';
import {
  decomposeExplicitProductFactors,
  explicitProductNodeFromZeroEquation,
} from './product-decomposition';
import type { MathJson } from './math-json';

describe('product decomposition', () => {
  it('extracts explicit zero-product sides from equations', () => {
    const leftProduct: MathJson = ['Multiply', 'a', 'z'];
    const rightProduct: MathJson = ['Multiply', 'z', 'b'];

    expect(explicitProductNodeFromZeroEquation(['Equal', leftProduct, 0])).toEqual(leftProduct);
    expect(explicitProductNodeFromZeroEquation(['Equal', 0, rightProduct])).toEqual(rightProduct);
    expect(explicitProductNodeFromZeroEquation(['Equal', leftProduct, rightProduct])).toBeNull();
    expect(explicitProductNodeFromZeroEquation(['Add', leftProduct, 0])).toBeNull();
  });

  it('flattens multiply and invisible-operator factors', () => {
    const product: MathJson = [
      'Multiply',
      'a',
      ['InvisibleOperator', ['Add', 'z', ['Negate', 'b']], 'c'],
    ];

    const result = decomposeExplicitProductFactors(product, 'z');

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      throw new Error(result.message);
    }
    expect(result.factors).toHaveLength(3);
    expect(result.factors.map((factor) => factor.hasTarget)).toEqual([false, true, false]);
    expect(result.factors.map((factor) => factor.multiplicity)).toEqual([1, 1, 1]);
  });

  it('turns positive integer powers into factor multiplicity', () => {
    const factor: MathJson = ['Power', ['Add', 'z', ['Negate', 'a']], 3];

    const result = decomposeExplicitProductFactors(factor, 'z');

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      throw new Error(result.message);
    }
    expect(result.factors).toHaveLength(1);
    expect(result.factors[0].node).toEqual(['Add', 'z', ['Negate', 'a']]);
    expect(result.factors[0].multiplicity).toBe(3);
    expect(result.factors[0].hasTarget).toBe(true);
    expect(result.factors[0].latex).toContain('z');
    expect(result.factors[0].latex).toContain('a');
  });

  it('rejects target-bearing nonpositive or noninteger powers', () => {
    const fractionalPower: MathJson = ['Power', ['Add', 'z', 'a'], ['Rational', 1, 2]];
    const zeroPower: MathJson = ['Power', ['Add', 'z', 'a'], 0];

    expect(decomposeExplicitProductFactors(fractionalPower, 'z')).toMatchObject({
      kind: 'unsupported',
      reason: 'target-power',
    });
    expect(decomposeExplicitProductFactors(zeroPower, 'z')).toMatchObject({
      kind: 'unsupported',
      reason: 'target-power',
    });
  });

  it('preserves target-free unsupported powers as target-free factors', () => {
    const factor: MathJson = ['Power', 'a', ['Rational', 1, 2]];

    const result = decomposeExplicitProductFactors(factor, 'z');

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      throw new Error(result.message);
    }
    expect(result.factors).toHaveLength(1);
    expect(result.factors[0].node).toEqual(factor);
    expect(result.factors[0].multiplicity).toBe(1);
    expect(result.factors[0].hasTarget).toBe(false);
    expect(result.factors[0].latex).toContain('a');
  });
});
