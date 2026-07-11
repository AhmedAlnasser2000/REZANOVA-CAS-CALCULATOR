import { describe, expect, it } from 'vitest';
import {
  profileEquationResult,
  profileSymbolicCoreResult,
  profileSymbolicIntegrationResult,
  profileSymbolicLimitsResult,
} from './producer-profile';

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

  it('keeps proof-aware Limit serialization stable under pedagogical-v1', () => {
    const result = { kind: 'finite', exactLatex: String.raw`\lim_{x\to0}f(x)=1` };
    expect(profileSymbolicLimitsResult(result)).toBe(result);
  });

  it('keeps proof-aware Integration serialization stable under pedagogical-v1', () => {
    const result = { kind: 'elementary', exactLatex: String.raw`\int x\,dx=\frac{x^2}{2}+C` };
    expect(profileSymbolicIntegrationResult(result)).toBe(result);
  });

  it('keeps generic symbolic serialization stable under pedagogical-v1', () => {
    const result = { kind: 'success', exactLatex: String.raw`2x` };
    expect(profileSymbolicCoreResult(result)).toBe(result);
  });
});
