import { describe, expect, it } from 'vitest';
import { diagnoseComplexInfiniteFamilyPolicyForLatex } from './infinite-family-policy';

describe('Complex infinite-family policy', () => {
  it('detects trig, log, and exponential branch-family carriers', () => {
    const report = diagnoseComplexInfiniteFamilyPolicyForLatex(
      String.raw`\sin(z)+\log(z)+2^z=0`,
      { target: 'z' },
    );

    expect(report.hasInfiniteFamilyCandidate).toBe(true);
    expect(report.families.join(' ')).toContain('periodic trig family');
    expect(report.families.join(' ')).toContain('logarithmic branch family');
    expect(report.families.join(' ')).toContain('exponential branch family');
    expect(report.detailLines.join(' ')).toContain('bounded-region');
    expect(report.detailLines.join(' ')).toContain('symbolic-family');
  });

  it('reports no family carrier for non-periodic algebraic numeric forms', () => {
    const report = diagnoseComplexInfiniteFamilyPolicyForLatex('z^2+1=0', { target: 'z' });

    expect(report.hasInfiniteFamilyCandidate).toBe(false);
    expect(report.families).toEqual([]);
  });
});
