import { describe, expect, it } from 'vitest';
import { collectOutcomeText, makeRequest } from './test-support';
import { runEquationComplexBenchmarkRegionFallback } from './complex-benchmark-region-runner';

function request(equationLatex: string, target = 'z') {
  return {
    ...makeRequest(),
    equationScreen: 'symbolic' as const,
    equationLatex,
    equationSolveTarget: target,
    equationAnswerMode: 'exact' as const,
    equationDomainIntent: 'complex' as const,
    angleUnit: 'rad' as const,
    complexExactForm: 'rectangular' as const,
  };
}

describe('Equation Complex benchmark region runner', () => {
  it('keeps global polynomial Complex evidence ahead of benchmark region runs', () => {
    const result = runEquationComplexBenchmarkRegionFallback(request('x^6+x+1=0', 'x'));

    expect(result.status).toBe('primary-supported');
    expect(result.attemptedRegions).toHaveLength(0);
    expect(result.outcome.kind).toBe('success');
    expect(result.evidence).toMatchObject({
      complex_numeric_scope: 'global-polynomial',
      complex_engine: 'complex-polynomial-aberth',
      complex_verification_status: 'global-polynomial',
      complex_branch_policy: 'not-applicable',
      complex_candidate_count: 6,
    });
  });

  it('keeps exact symbolic infinite families ahead of benchmark region runs', () => {
    const result = runEquationComplexBenchmarkRegionFallback(request('\\sin(x)=0', 'x'));

    expect(result.status).toBe('primary-supported');
    expect(result.attemptedRegions).toHaveLength(0);
    expect(result.outcome.kind).toBe('success');
    expect(result.evidence).toMatchObject({
      complex_numeric_scope: 'symbolic-family',
      complex_engine: 'exact-symbolic',
      complex_verification_status: 'not-applicable',
      complex_branch_policy: 'branch-family',
    });
  });

  it('records Complex locus cases as deferred without staged region runs', () => {
    const result = runEquationComplexBenchmarkRegionFallback(request(String.raw`\left|z-1\right|=2`));

    expect(result.status).toBe('primary-controlled-stop');
    expect(result.attemptedRegions).toHaveLength(0);
    expect(result.outcome.kind).toBe('error');
    expect(result.evidence).toMatchObject({
      complex_numeric_scope: 'locus-deferred',
      complex_engine: 'locus-deferred',
      complex_verification_status: 'not-applicable',
      complex_branch_policy: 'locus-deferred',
    });
    expect(collectOutcomeText(result.outcome)).toContain('locus-deferred');
    expect(collectOutcomeText(result.outcome)).toContain('two-real-variable');
  });

  it('records controlled Complex abs boundaries without staged region runs', () => {
    const result = runEquationComplexBenchmarkRegionFallback(request('abs(2x+1)=x-5', 'x'));

    expect(result.status).toBe('primary-supported');
    expect(result.attemptedRegions).toHaveLength(0);
    expect(result.outcome.kind).toBe('success');
    expect(result.evidence).toMatchObject({
      complex_numeric_scope: 'controlled-boundary',
      complex_engine: 'complex-boundary-policy',
      complex_verification_status: 'not-applicable',
      complex_branch_policy: 'locus-deferred',
      complex_candidate_count: 0,
    });
    expect(collectOutcomeText(result.outcome)).toContain('Absolute-value equations use magnitude semantics');
  });

  it('tries the first staged benchmark box after exact and polynomial routes miss', () => {
    const result = runEquationComplexBenchmarkRegionFallback(request('e^z+z=0'));

    expect(result.status).toBe('bounded-region-supported');
    expect(result.attemptedRegions).toHaveLength(1);
    expect(result.outcome.kind).toBe('success');
    expect(result.evidence).toMatchObject({
      complex_numeric_scope: 'bounded-region',
      complex_engine: 'complex-region-argument-principle',
      complex_verification_status: 'contour-verified',
      complex_contour_root_count: 1,
      complex_candidate_count: 1,
      complex_branch_policy: 'principal',
      complex_region: {
        re_min: '-2',
        re_max: '2',
        im_min: '-2',
        im_max: '2',
      },
    });
    expect(result.evidence?.complex_searched_region_notes).toContain('Benchmark staged region 1/2');
    expect(result.evidence?.complex_searched_region_notes).toContain('bounded-region evidence enumerates only roots inside');
    expect(collectOutcomeText(result.outcome)).toContain('This is local to the supplied rectangular region');
    expect(collectOutcomeText(result.outcome)).toContain('Exact Complex branch-family routes are tried before bounded Complex Region solving.');
  });

  it('continues to the larger staged box after a verified zero-root first box', () => {
    const result = runEquationComplexBenchmarkRegionFallback(request('e^z+z-20=0'));

    expect(result.status).toBe('bounded-region-supported');
    expect(result.attemptedRegions.length).toBeGreaterThanOrEqual(2);
    expect(result.attemptedRegions[0]?.evidence).toMatchObject({
      complex_verification_status: 'contour-verified',
      complex_contour_root_count: 0,
      complex_candidate_count: 0,
    });
    expect(result.evidence?.complex_region).toMatchObject({
      re_min: '-10',
      re_max: '10',
      im_min: '-10',
      im_max: '10',
    });
    expect(result.evidence?.complex_contour_root_count).toBe(result.evidence?.complex_candidate_count);
    expect(result.evidence?.complex_searched_region_notes).toContain('Benchmark staged region 2/2');
  });

  it('records verified zero-root regions as evidence without marking them supported', () => {
    const result = runEquationComplexBenchmarkRegionFallback(request('e^z+z=0'), {
      regions: [{
        reMin: '1',
        reMax: '2',
        imMin: '1',
        imMax: '2',
      }],
    });

    expect(result.status).toBe('bounded-region-zero-roots');
    expect(result.outcome.kind).toBe('error');
    expect(result.evidence).toMatchObject({
      complex_numeric_scope: 'bounded-region',
      complex_engine: 'complex-region-argument-principle',
      complex_verification_status: 'contour-verified',
      complex_contour_root_count: 0,
      complex_candidate_count: 0,
      complex_branch_policy: 'principal',
    });
  });
});
