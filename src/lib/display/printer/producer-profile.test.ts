import { describe, expect, it } from 'vitest';
import { profileEquationResult } from './producer-profile';

describe('producer printer profiles', () => {
  it('keeps Equation domain serialization stable under pedagogical-v1', () => {
    const result = {
      kind: 'success' as const,
      exactLatex: String.raw`x\in\left\{2,\ 3\right\}`,
      branchCount: 2,
    };

    expect(profileEquationResult(result)).toBe(result);
    expect(profileEquationResult(result)).toEqual(result);
  });
});
