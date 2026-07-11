import { describe, expect, it } from 'vitest';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  MATH_JSON_MAX_DEPTH,
  MATH_JSON_MAX_NODES,
  validateSerializableMathJson,
} from './math-json';

describe('serializable MathJSON validation', () => {
  it('accepts and clones bounded expression nodes', () => {
    const input = ['Add', 'x', ['Divide', 1, 2]];
    const result = validateSerializableMathJson(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.validated.value).toEqual(input);
      expect(result.validated.value).not.toBe(input);
      expect(result.validated.nodeCount).toBeGreaterThan(0);
      expect(result.validated.depth).toBe(3);
    }
  });

  it('rejects boxed expressions, cycles, and non-finite literals', () => {
    const ce = new ComputeEngine();
    expect(validateSerializableMathJson(ce.box(['Add', 'x', 1])).ok).toBe(false);

    const cyclic: unknown[] = ['Add', 1];
    cyclic.push(cyclic);
    const cyclicResult = validateSerializableMathJson(cyclic);
    expect(cyclicResult).toMatchObject({ ok: false, failure: { reason: 'cyclic-value' } });
    expect(validateSerializableMathJson(['Add', Number.NaN, 1]))
      .toMatchObject({ ok: false, failure: { reason: 'non-finite-number' } });
  });

  it('enforces depth, node, and byte limits before data crosses a host boundary', () => {
    let deep: unknown = 'x';
    for (let index = 0; index < MATH_JSON_MAX_DEPTH; index += 1) {
      deep = ['Negate', deep];
    }
    expect(validateSerializableMathJson(deep))
      .toMatchObject({ ok: false, failure: { reason: 'depth-limit' } });

    const wide = ['Add', ...Array.from({ length: MATH_JSON_MAX_NODES }, () => 1)];
    expect(validateSerializableMathJson(wide))
      .toMatchObject({ ok: false, failure: { reason: 'node-limit' } });

    expect(validateSerializableMathJson(['Symbol', 'x'.repeat(128)], { maxBytes: 32 }))
      .toMatchObject({ ok: false, failure: { reason: 'byte-limit' } });
  });
});
