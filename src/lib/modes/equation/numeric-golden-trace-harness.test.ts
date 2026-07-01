import { describe, expect, it } from 'vitest';
import type { DisplayOutcome, NumericSolveInterval } from '../../../types/calculator';
import { runEquationMode } from '../equation';
import { collectOutcomeText, makeRequest } from './test-support';

type GoldenTrace = {
  equationLatex: string;
  elapsedMs: number;
  kind: DisplayOutcome['kind'];
  solutionKind?: string;
  resultOrigin?: string;
  answerDomain?: string;
  numericMethod?: string;
  solveBadges: readonly string[];
  rootCount: number;
  rejectedCount: number;
  detailTitles: readonly string[];
  detailText: string;
  text: string;
};

type TraceableOutcome = DisplayOutcome & {
  solutionKind?: string;
  resultOrigin?: string;
  answerDomain?: string;
  numericMethod?: string;
  solveBadges?: string[];
  rejectedCandidateCount?: number;
  detailSections?: Array<{ title: string; lines: string[] }>;
  candidateValues?: number[];
  branchReadback?: { branchesLatex: string[] };
  approxText?: string;
  exactLatex?: string;
};

const SOFT_MAX_ELAPSED_MS = 5_000;
const SOFT_MAX_ROOT_COUNT = 128;
const SOFT_MAX_REJECTED_COUNT = 64;

function runGoldenTrace(input: {
  equationLatex: string;
  target?: string;
  numericInterval?: NumericSolveInterval;
  storedVariables?: Parameters<typeof runEquationMode>[0]['storedVariables'];
  useStoredValueSubstitution?: boolean;
  equationDomainIntent?: Parameters<typeof runEquationMode>[0]['equationDomainIntent'];
}) {
  const started = performance.now();
  const result = runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex: input.equationLatex,
    equationSolveTarget: input.target ?? 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: input.equationDomainIntent ?? 'real',
    angleUnit: 'rad',
    numericInterval: input.numericInterval,
    storedVariables: input.storedVariables,
    useStoredValueSubstitution: input.useStoredValueSubstitution,
  });
  const elapsedMs = performance.now() - started;
  const traceable = result as TraceableOutcome;
  const detailText = traceable.detailSections?.flatMap((section) => section.lines).join(' ') ?? '';
  const readbackText = [
    traceable.approxText,
    traceable.exactLatex,
    traceable.branchReadback?.branchesLatex.join(' '),
  ].filter(Boolean).join(' ');
  const trace: GoldenTrace = {
    equationLatex: input.equationLatex,
    elapsedMs,
    kind: result.kind,
    solutionKind: traceable.solutionKind,
    resultOrigin: traceable.resultOrigin,
    answerDomain: traceable.answerDomain,
    numericMethod: traceable.numericMethod,
    solveBadges: traceable.solveBadges ?? [],
    rootCount: result.kind === 'success'
      ? traceable.candidateValues?.length ?? traceable.branchReadback?.branchesLatex.length ?? 0
      : 0,
    rejectedCount: traceable.rejectedCandidateCount ?? 0,
    detailTitles: traceable.detailSections?.map((section) => section.title) ?? [],
    detailText,
    text: [collectOutcomeText(result), readbackText].filter(Boolean).join(' '),
  };

  return { result, trace };
}

function expectSoftTraceBudgets(trace: GoldenTrace) {
  expect(trace.elapsedMs).toBeLessThan(SOFT_MAX_ELAPSED_MS);
  expect(trace.rootCount).toBeLessThanOrEqual(SOFT_MAX_ROOT_COUNT);
  expect(trace.rejectedCount).toBeLessThanOrEqual(SOFT_MAX_REJECTED_COUNT);
}

function expectApproxRoot(roots: readonly number[] | undefined, expected: number, tolerance = 1e-6) {
  expect(roots?.some((root) => Math.abs(root - expected) <= tolerance)).toBe(true);
}

function expectTraceTextContainsApprox(trace: GoldenTrace, expected: number) {
  expect(trace.text).toContain(expected.toFixed(6));
}

describe('Equation numeric golden trace harness', () => {
  it('records deterministic polynomial route evidence without symbolic formula sections', () => {
    const { result, trace } = runGoldenTrace({ equationLatex: 'x^7-x=5' });

    expectSoftTraceBudgets(trace);
    expect(trace.kind).toBe('success');
    expect(trace.solutionKind).toBe('approximate-numeric');
    expect(trace.resultOrigin).toBe('numeric-fallback');
    expect(trace.answerDomain).toBe('real');
    expect(trace.numericMethod).toBe('Deterministic numeric polynomial roots');
    expect(trace.detailTitles).toContain('Polynomial Diagnostics');
    expect(trace.text).toContain('Root engine: aberth-ehrlich');
    expect(trace.text).not.toContain('Real Cardano Cases');
    expect(trace.text).not.toContain('Real Ferrari Cases');
    if (result.kind !== 'success') {
      throw new Error('Expected deterministic numeric success');
    }
    expectApproxRoot(result.candidateValues, 1.3007656097);
  });

  it('records rational exclusions and candidate validation evidence', () => {
    const { result, trace } = runGoldenTrace({ equationLatex: String.raw`\frac{x^7-x-5}{x-2}=0` });

    expectSoftTraceBudgets(trace);
    expect(trace.kind).toBe('success');
    expect(trace.numericMethod).toBe('Deterministic numeric rational roots');
    expect(trace.solveBadges).toEqual(expect.arrayContaining(['LCD Clear', 'Candidate Checked']));
    expect(trace.detailTitles).toContain('Domain and Exclusions');
    expect(trace.detailText).toContain('x-2 \\ne0');
    expect(trace.detailText).toContain('x\\ne 2');
    if (result.kind !== 'success') {
      throw new Error('Expected deterministic rational success');
    }
    expectApproxRoot(result.candidateValues, 1.3007656097);
  });

  it('records nonlinear bounded search windows and residual evidence', () => {
    const { result, trace } = runGoldenTrace({ equationLatex: String.raw`x^2+\sin(x)=2` });

    expectSoftTraceBudgets(trace);
    expect(trace.kind).toBe('success');
    expect(trace.numericMethod).toBe('Real nonlinear bounded numeric search');
    expect(trace.detailTitles).toContain('Search Diagnostics');
    expect(trace.detailText).toContain('Searched windows: [-10, 10], [-100, 100].');
    expect(trace.detailText).toContain('Residual tolerance: 1e-8.');
    if (result.kind !== 'success') {
      throw new Error('Expected nonlinear numeric success');
    }
    expectApproxRoot(result.candidateValues, -1.728466, 1e-5);
    expectApproxRoot(result.candidateValues, 1.06155, 1e-5);
  });

  it('records discontinuity-heavy search facts, probe diagnostics, and extraneous candidates', () => {
    const { result, trace } = runGoldenTrace({ equationLatex: String.raw`\ln(x-1)+\frac{1}{x-2}=3` });

    expectSoftTraceBudgets(trace);
    expect(trace.kind).toBe('success');
    expect(trace.numericMethod).toBe('Real nonlinear bounded numeric search');
    expect(trace.detailTitles).toEqual(expect.arrayContaining([
      'Domain and Exclusions',
      'Domain Probe',
      'Search Diagnostics',
      'Extraneous Solutions',
    ]));
    expect(trace.detailText).toContain('x-1 >0');
    expect(trace.detailText).toContain('x-2 \\ne0');
    expect(trace.detailText).toContain('Candidate approximately 2');
    if (result.kind !== 'success') {
      throw new Error('Expected discontinuity-heavy numeric success');
    }
    expectApproxRoot(result.candidateValues, 2.372685, 1e-5);
    expectApproxRoot(result.candidateValues, 20.00011, 1e-4);
  });

  it('records interval-local periodic roots and exclusion evidence', () => {
    const { result, trace } = runGoldenTrace({
      equationLatex: String.raw`\frac{\sin(x)}{x}=0`,
      numericInterval: { start: '0', end: '10', subdivisions: 256 },
    });

    expectSoftTraceBudgets(trace);
    expect(trace.kind).toBe('success');
    expect(trace.solutionKind).toBe('approximate-numeric');
    expect(trace.numericMethod).toBe('Bracket-first adaptive ITP + guarded Newton/secant acceleration + local-minimum recovery');
    expect(trace.solveBadges).toContain('Numeric Interval');
    expect(trace.detailTitles).toContain('Periodic Interval Summary');
    expect(trace.detailText).toContain('Roots are local to this chosen interval');
    expect(trace.detailText).toContain('Sin(x) carrier repeats every about 6.283185');
    expect(trace.detailText).toContain('x \\ne0');
    if (result.kind !== 'success') {
      throw new Error('Expected periodic interval success');
    }
    expectTraceTextContainsApprox(trace, Math.PI);
    expect(result.approxText ?? '').not.toContain('x ~= 0');
  });

  it('records periodic pole evidence for tangent interval solving', () => {
    const { result, trace } = runGoldenTrace({
      equationLatex: String.raw`\tan(x)=1`,
      numericInterval: { start: '0', end: '10', subdivisions: 256 },
    });

    expectSoftTraceBudgets(trace);
    expect(trace.kind).toBe('success');
    expect(trace.numericMethod).toBe('Bracket-first adaptive ITP + guarded Newton/secant acceleration + local-minimum recovery');
    expect(trace.detailTitles).toContain('Periodic Interval Summary');
    expect(trace.detailText).toContain('Tan(x) carrier repeats every about 3.141593');
    expect(trace.detailText).toContain(String.raw`\cos\left(x\right) \ne0`);
    if (result.kind !== 'success') {
      throw new Error('Expected tangent interval success');
    }
    expectTraceTextContainsApprox(trace, Math.PI / 4);
    expectTraceTextContainsApprox(trace, Math.PI / 4 + Math.PI);
  });

  it('records stored-value interval substitution while protecting the target', () => {
    const { result, trace } = runGoldenTrace({
      equationLatex: 'a+x=5',
      numericInterval: { start: '0', end: '5', subdivisions: 64 },
      storedVariables: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
        { name: 'x', valueLatex: '100', numericValue: 100 },
      ],
    });

    expectSoftTraceBudgets(trace);
    expect(trace.kind).toBe('success');
    expect(trace.solveBadges).toContain('Numeric Interval');
    expect(trace.detailText).toContain('Used stored values: a=2.');
    expect(trace.detailText).toContain('Kept x symbolic as the solve target.');
    if (result.kind !== 'success') {
      throw new Error('Expected stored-value interval success');
    }
    expect(trace.text).toContain('x ~= 3');
  });

  it('locks the current Complex numeric polynomial boundary before visible catchup', () => {
    const { trace } = runGoldenTrace({
      equationLatex: 'x^6+x+1=0',
      equationDomainIntent: 'complex',
    });

    expectSoftTraceBudgets(trace);
    expect(trace.text).not.toContain('Real Cardano Cases');
    expect(trace.text).not.toContain('Real Ferrari Cases');
    expect(trace.text).not.toContain('RootOf');
  });
});
