import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../../types/calculator';
import { runEquationMode } from '../equation';
import { collectOutcomeText, makeRequest } from './test-support';
import { tryComplexRegionNonlinearSolveFallback } from './complex-region-nonlinear-solve';

const unsupportedExactOutcome: DisplayOutcome = {
  kind: 'error',
  title: 'Solve',
  error: 'This equation is outside the supported exact symbolic solve families.',
  warnings: [],
};

function solve(
  equationLatex: string,
  extra: Partial<Parameters<typeof runEquationMode>[0]> = {},
) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'z',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'complex',
    angleUnit: 'rad',
    complexRegion: {
      reMin: '-1',
      reMax: '1',
      imMin: '-1',
      imMax: '1',
    },
    ...extra,
  });
}

describe('Equation Complex region nonlinear solve', () => {
  it('solves a bounded principal-branch Complex nonlinear region after exact routes miss', () => {
    const result = solve('e^z+z=0');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Complex region nonlinear success');
    }
    expect(result.solutionKind).toBe('approximate-numeric');
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.answerDomain).toBe('complex');
    expect(result.numericMethod).toBe('Complex region nonlinear solve');
    expect(result.exactLatex).toContain('z\\approx -0.567143');
    expect(result.approxText).toContain('z ~= -0.567143');
    const text = collectOutcomeText(result);
    expect(text).toContain('No supported exact form was found; showing validated approximate complex roots in the selected region.');
    expect(text).toContain('roots found in this complex region');
    expect(text).toContain('contour count verified');
    expect(text).toContain('Contour count verified: 1 root in this region.');
    expect(text).not.toContain('Real Cardano Cases');
    expect(text).not.toContain('Real Ferrari Cases');
  });

  it('uses the direct fallback seam for explicit exp and sine region fixtures', () => {
    const expResult = tryComplexRegionNonlinearSolveFallback({
      equationLatex: 'e^z=1',
      equationSolveTarget: 'z',
      angleUnit: 'rad',
      complexExactForm: 'rectangular',
      complexRegion: {
        reMin: '-1',
        reMax: '1',
        imMin: '-1',
        imMax: '1',
      },
      sharedOutcome: unsupportedExactOutcome,
    });
    const sineResult = tryComplexRegionNonlinearSolveFallback({
      equationLatex: '\\sin(z)=0',
      equationSolveTarget: 'z',
      angleUnit: 'rad',
      complexExactForm: 'rectangular',
      complexRegion: {
        reMin: '-4',
        reMax: '4',
        imMin: '-1',
        imMax: '1',
        gridSize: 9,
      },
      sharedOutcome: unsupportedExactOutcome,
    });

    expect(expResult?.kind).toBe('success');
    expect(sineResult?.kind).toBe('success');
    if (!expResult || expResult.kind !== 'success' || !sineResult || sineResult.kind !== 'success') {
      throw new Error('Expected direct Complex region successes');
    }
    expect(expResult.exactLatex).toContain('z\\approx 0');
    expect(sineResult.branchReadback?.branchesLatex).toHaveLength(3);
    expect(collectOutcomeText(sineResult)).toContain('Contour count verified: 3 roots in this region.');
  });

  it('honors Complex approximate output forms for region roots', () => {
    const complexRegion = {
      reMin: '-1',
      reMax: '1',
      imMin: '0.2',
      imMax: '2',
      gridSize: 9,
    };
    const polar = solve('z^2+1+e^z/10=0', { complexExactForm: 'polar', complexRegion });
    const cis = solve('z^2+1+e^z/10=0', { complexExactForm: 'cis', complexRegion });

    expect(polar.kind).toBe('success');
    expect(cis.kind).toBe('success');
    if (polar.kind !== 'success' || cis.kind !== 'success') {
      throw new Error('Expected formatted Complex region successes');
    }
    expect(polar.exactLatex).toContain('\\angle');
    expect(polar.approxText).toContain('angle');
    expect(cis.exactLatex).toContain('\\operatorname{cis}');
    expect(cis.approxText).toContain('cis');
  });

  it('stops honestly when a principal branch cut crosses the requested region', () => {
    const result = tryComplexRegionNonlinearSolveFallback({
      equationLatex: '\\ln(z)=0',
      equationSolveTarget: 'z',
      angleUnit: 'rad',
      complexExactForm: 'rectangular',
      complexRegion: {
        reMin: '-2',
        reMax: '2',
        imMin: '-1',
        imMax: '1',
      },
      sharedOutcome: unsupportedExactOutcome,
    });

    expect(result?.kind).toBe('error');
    if (!result || result.kind !== 'error') {
      throw new Error('Expected Complex branch-cut stop');
    }
    expect(result.error).toContain('principal branch cut');
    expect(collectOutcomeText(result)).toContain('requested region contains the principal branch point at 0');
  });

  it('does not run without an explicit bounded Complex region', () => {
    const result = tryComplexRegionNonlinearSolveFallback({
      equationLatex: 'e^z+z=0',
      equationSolveTarget: 'z',
      angleUnit: 'rad',
      complexExactForm: 'rectangular',
      sharedOutcome: unsupportedExactOutcome,
    });

    expect(result).toBeUndefined();
  });

  it('protects the target and reports missing non-target stored values before region solving', () => {
    const result = solve('e^{z+a}+z=0');

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected missing stored-value error');
    }
    const text = collectOutcomeText(result);
    expect(result.error).toContain('Missing numeric value: a');
    expect(text).toContain('Protected solve target: z.');
    expect(text).toContain('Store a numeric value for a in Variables.');
  });
});
