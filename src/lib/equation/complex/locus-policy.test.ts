import { describe, expect, it } from 'vitest';
import { diagnoseComplexLocusPolicyForLatex } from './locus-policy';

describe('Complex locus policy', () => {
  it('detects absolute-value, Re, Im, and conjugate carriers that contain the target', () => {
    const cases = [
      String.raw`\left|z-1\right|=2`,
      String.raw`\operatorname{Re}(z)=1`,
      String.raw`\operatorname{Im}(z)=1`,
      String.raw`\overline{z}=1`,
      String.raw`\operatorname{conj}(z)=1`,
      'conj(z)=1',
      'Re(z)=1',
      'Im(z)=1',
    ];

    for (const equationLatex of cases) {
      const report = diagnoseComplexLocusPolicyForLatex(equationLatex, { target: 'z' });
      expect(report.hasLocusDeferredCarrier, equationLatex).toBe(true);
      expect(report.detailLines.join(' ')).toContain('locus-deferred');
      expect(report.detailLines.join(' ')).toContain('two-real-variable');
    }
  });

  it('ignores non-locus holomorphic equations', () => {
    const report = diagnoseComplexLocusPolicyForLatex('e^z+z=0', { target: 'z' });

    expect(report.hasLocusDeferredCarrier).toBe(false);
    expect(report.carriers).toEqual([]);
  });

  it('ignores locus carriers that do not contain the selected target', () => {
    const report = diagnoseComplexLocusPolicyForLatex(String.raw`\operatorname{Re}(a)=1`, { target: 'z' });

    expect(report.hasLocusDeferredCarrier).toBe(false);
  });
});
