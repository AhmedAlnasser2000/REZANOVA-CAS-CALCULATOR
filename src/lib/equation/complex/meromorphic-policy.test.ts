import { describe, expect, it } from 'vitest';
import { diagnoseMeromorphicPolicyForLatex } from './meromorphic-policy';

describe('Complex meromorphic pole policy', () => {
  it('counts known denominator poles inside the selected region', () => {
    const report = diagnoseMeromorphicPolicyForLatex('(z-1)/z=0', {
      target: 'z',
      region: { reMin: -0.5, reMax: 1.5, imMin: -0.5, imMax: 0.5 },
    });

    expect(report.status).toBe('meromorphic');
    expect(report.shouldStop).toBe(false);
    expect(report.knownPoleCount).toBe(1);
    expect(report.detailLines.join(' ')).toContain('zeros minus known poles');
  });

  it('stops when a denominator pole lies on the contour boundary', () => {
    const report = diagnoseMeromorphicPolicyForLatex('1/z=0', {
      target: 'z',
      region: { reMin: 0, reMax: 2, imMin: -1, imMax: 1 },
    });

    expect(report.status).toBe('unsafe');
    expect(report.shouldStop).toBe(true);
    expect(report.detailLines.join(' ')).toContain('Boundary pole');
  });

  it('counts direct tangent poles and stops on unmapped tangent carriers', () => {
    const direct = diagnoseMeromorphicPolicyForLatex(String.raw`\tan(z)-z=0`, {
      target: 'z',
      region: { reMin: -2, reMax: 2, imMin: -1, imMax: 1 },
    });
    const mapped = diagnoseMeromorphicPolicyForLatex(String.raw`\tan(z+1)=0`, {
      target: 'z',
      region: { reMin: -2, reMax: 2, imMin: -1, imMax: 1 },
    });

    expect(direct.status).toBe('meromorphic');
    expect(direct.knownPoleCount).toBe(2);
    expect(mapped.status).toBe('unknown');
    expect(mapped.shouldStop).toBe(true);
  });
});
