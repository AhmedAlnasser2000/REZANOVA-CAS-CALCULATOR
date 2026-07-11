import { describe, expect, it } from 'vitest';
import {
  profileCalculusResult,
  profileEquationResult,
  profileGeometryResult,
  profileStatisticsResult,
  profileSymbolicCoreResult,
  profileSymbolicIntegrationResult,
  profileSymbolicLimitsResult,
  profileTableResult,
  profileTrigonometryResult,
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

  it('keeps Calculus workspace serialization stable under pedagogical-v1', () => {
    const result = { kind: 'success', exactLatex: String.raw`y=Ce^{2x}` };
    expect(profileCalculusResult(result)).toBe(result);
  });

  it.each([
    ['Trigonometry', profileTrigonometryResult, String.raw`x=30^\circ+360^\circ k`],
    ['Geometry', profileGeometryResult, String.raw`d=\sqrt{5}`],
    ['Statistics', profileStatisticsResult, String.raw`\bar{x}=2`],
    ['Table', profileTableResult, String.raw`f(x)=x^2`],
  ])('keeps %s serialization stable under pedagogical-v1', (_name, profile, exactLatex) => {
    const result = { kind: 'success', exactLatex };
    expect(profile(result)).toBe(result);
  });
});
