import { describe, expect, it } from 'vitest';
import {
  diagnosePrincipalBranchPolicyForLatex,
} from './branch-cut-policy';

describe('Complex principal branch-cut policy', () => {
  it('records principal branch families without enabling nonlinear solving', () => {
    const report = diagnosePrincipalBranchPolicyForLatex(
      String.raw`\ln(z)+\sqrt{z}+z^{3/2}+\arcsin(z)`,
      { target: 'z' },
    );

    expect(report.status).toBe('safe');
    expect(report.shouldStop).toBe(false);
    expect([...new Set(report.diagnostics.map((diagnostic) => diagnostic.family))].sort()).toEqual([
      'principal-fractional-power',
      'principal-inverse-trig',
      'principal-log',
      'principal-root',
    ].sort());
    expect(report.detailLines.join(' ')).toContain('principal-branch only');
    expect(report.detailLines.join(' ')).toContain('Principal inverse-trig cuts');
  });

  it('warns when exact constants touch principal branch cuts', () => {
    const logCut = diagnosePrincipalBranchPolicyForLatex(String.raw`\ln(-1)`, { target: 'z' });
    const logZero = diagnosePrincipalBranchPolicyForLatex(String.raw`\log(0)`, { target: 'z' });
    const rootCut = diagnosePrincipalBranchPolicyForLatex(String.raw`\sqrt{-1}`, { target: 'z' });

    expect(logCut.status).toBe('unknown');
    expect(logCut.shouldStop).toBe(false);
    expect(logCut.detailLines.join(' ')).toContain('lies on the principal branch cut');
    expect(logZero.status).toBe('unsafe');
    expect(logZero.shouldStop).toBe(true);
    expect(logZero.detailLines.join(' ')).toContain('logarithm branch point 0');
    expect(rootCut.status).toBe('unknown');
    expect(rootCut.shouldStop).toBe(false);
  });

  it('marks direct target regions crossing log/root/power branch cuts as unsafe', () => {
    const crossing = diagnosePrincipalBranchPolicyForLatex(String.raw`\ln(z)+\sqrt{z}`, {
      target: 'z',
      region: { reMin: -2, reMax: 1, imMin: -1, imMax: 1 },
    });
    const rightHalfPlane = diagnosePrincipalBranchPolicyForLatex(String.raw`\ln(z)+\sqrt{z}`, {
      target: 'z',
      region: { reMin: 0.5, reMax: 2, imMin: -1, imMax: 1 },
    });

    expect(crossing.status).toBe('unsafe');
    expect(crossing.shouldStop).toBe(true);
    expect(crossing.detailLines.join(' ')).toContain('branch point at 0');
    expect(rightHalfPlane.status).toBe('safe');
    expect(rightHalfPlane.shouldStop).toBe(false);
    expect(rightHalfPlane.detailLines.join(' ')).toContain('does not cross the principal negative-real-axis branch cut');
  });

  it('certifies real-affine branch pullbacks when the mapped region is safe', () => {
    const report = diagnosePrincipalBranchPolicyForLatex(String.raw`\ln(z+1)`, {
      target: 'z',
      region: { reMin: 1, reMax: 2, imMin: 1, imMax: 2 },
    });

    expect(report.status).toBe('safe');
    expect(report.shouldStop).toBe(false);
    expect(report.detailLines.join(' ')).toContain('recognized as a real-affine target map');
    expect(report.detailLines.join(' ')).toContain('does not cross the principal negative-real-axis branch cut');
  });

  it('marks unsafe real-affine branch pullbacks that cross the cut', () => {
    const report = diagnosePrincipalBranchPolicyForLatex(String.raw`\ln(z-1)`, {
      target: 'z',
      region: { reMin: -1, reMax: 1, imMin: -0.5, imMax: 0.5 },
    });

    expect(report.status).toBe('unsafe');
    expect(report.shouldStop).toBe(true);
    expect(report.detailLines.join(' ')).toContain('recognized as a real-affine target map');
    expect(report.detailLines.join(' ')).toContain('principal branch point at 0 after branch pullback');
  });

  it('fails closed for unsupported broad composed branch pullbacks', () => {
    const report = diagnosePrincipalBranchPolicyForLatex(String.raw`\ln(z^2+1)`, {
      target: 'z',
      region: { reMin: 2, reMax: 3, imMin: 1, imMax: 2 },
    });

    expect(report.status).toBe('unsafe');
    expect(report.shouldStop).toBe(true);
    expect(report.detailLines.join(' ')).toContain('non-affine or unsupported map');
    expect(report.detailLines.join(' ')).toContain('fails closed');
  });

  it('marks direct target regions crossing inverse-trig cuts as unsafe', () => {
    const arcsinCut = diagnosePrincipalBranchPolicyForLatex(String.raw`\arcsin(z)`, {
      target: 'z',
      region: { reMin: 0.5, reMax: 2, imMin: -0.5, imMax: 0.5 },
    });
    const arctanCut = diagnosePrincipalBranchPolicyForLatex(String.raw`\arctan(z)`, {
      target: 'z',
      region: { reMin: -0.2, reMax: 0.2, imMin: 0.5, imMax: 2 },
    });

    expect(arcsinCut.status).toBe('unsafe');
    expect(arcsinCut.detailLines.join(' ')).toContain('inverse-trig branch cut');
    expect(arctanCut.status).toBe('unsafe');
    expect(arctanCut.detailLines.join(' ')).toContain('inverse-trig branch cut');
  });
});
