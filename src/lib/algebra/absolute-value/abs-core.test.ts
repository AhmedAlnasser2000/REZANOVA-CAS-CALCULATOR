import { describe, expect, it } from 'vitest';
import { normalizeExactAbsoluteValueNode } from '../abs-core';
import { boxLatex } from '../../symbolic-engine/patterns';

describe('abs-core', () => {
  it('normalizes direct bounded abs identities for simplify-only reuse', () => {
    const normalized = normalizeExactAbsoluteValueNode(['Power', ['Abs', 'x'], 2]);

    expect(normalized).not.toBeNull();
    expect(boxLatex(normalized?.normalizedNode)).toBe('x^2');
    expect(normalized?.exactSupplementLatex).toEqual([]);
  });
});
