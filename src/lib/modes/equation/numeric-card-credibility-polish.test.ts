import { describe, expect, it } from 'vitest';
import type { DisplayDetailSection, DisplayOutcome, NumericSolveInterval } from '../../../types/calculator';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function solve(input: {
  equationLatex: string;
  interval?: NumericSolveInterval;
  angleUnit?: 'rad' | 'deg';
  domainIntent?: 'real' | 'complex';
}) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex: input.equationLatex,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: input.domainIntent ?? 'real',
    angleUnit: input.angleUnit ?? 'rad',
    numericInterval: input.interval,
  });
}

function allDetails(result: DisplayOutcome) {
  if (result.kind === 'prompt') {
    return '';
  }
  return result.detailSections?.flatMap((section) => section.lines).join(' ') ?? '';
}

function section(result: DisplayOutcome, title: string): DisplayDetailSection | undefined {
  if (result.kind === 'prompt') {
    return undefined;
  }
  return result.detailSections?.find((candidate) => candidate.title === title);
}

function sectionText(result: DisplayOutcome, title: string) {
  return section(result, title)?.lines.join(' ') ?? '';
}

function expectSuccess(result: DisplayOutcome) {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.kind}`);
  }
  return result;
}

function expectError(result: DisplayOutcome) {
  expect(result.kind).toBe('error');
  if (result.kind !== 'error') {
    throw new Error(`Expected error, received ${result.kind}`);
  }
  return result;
}

function numericRoots(result: Extract<DisplayOutcome, { kind: 'success' }>) {
  if (result.candidateValues && result.candidateValues.length > 0) {
    return result.candidateValues;
  }
  const fromReadback = result.branchReadback?.branchesLatex
    .map((branch) => Number(branch.replace(/,/gu, '').replace(/−/gu, '-').trim()))
    .filter((value) => Number.isFinite(value)) ?? [];
  if (fromReadback.length > 0) {
    return fromReadback;
  }
  return result.approxText
    ?.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/giu)
    ?.map((value) => Number(value.replace(/,/gu, '')))
    .filter((value) => Number.isFinite(value)) ?? [];
}

function expectApproxRoot(result: Extract<DisplayOutcome, { kind: 'success' }>, expected: number, tolerance = 1e-5) {
  expect(numericRoots(result).some((root) => Math.abs(root - expected) <= tolerance)).toBe(true);
}

describe('Equation numeric card credibility polish', () => {
  it('keeps non-real quadratic roots out of Real mode while Complex mode shows them', () => {
    const real = expectError(solve({ equationLatex: 'x^2+1=0' }));
    const complex = expectSuccess(solve({
      equationLatex: 'x^2+1=0',
      domainIntent: 'complex',
    }));

    expect(real.error).toContain('no real roots');
    expect(real.error).toContain('Complex On');
    expect(JSON.stringify(real)).not.toContain('\\imaginaryI');
    expect(complex.answerDomain).toBe('complex');
    expect(complex.exactLatex).toContain('-i');
    expect(complex.exactLatex).toContain('i');
  });

  it('scopes target-dependent exact branch guards away from global validity facts', () => {
    const squareRootSquare = expectSuccess(solve({
      equationLatex: String.raw`\sqrt{\left(x+1\right)^2}=x+3`,
    }));
    const absoluteValue = expectSuccess(solve({
      equationLatex: String.raw`\left|x+1\right|=x+3`,
    }));

    for (const result of [squareRootSquare, absoluteValue]) {
      expect(result.exactLatex).toBe('x=-2');
      expect(result.exactSupplementLatex ?? []).not.toContain(String.raw`\text{Conditions: } x+3\ge0`);
      expect(sectionText(result, 'Branch Guards')).toContain(String.raw`x+3\ge0`);
    }
  });

  it('keeps quotient periodic evidence out of domain facts and dedupes x exclusions', () => {
    const result = expectSuccess(solve({
      equationLatex: String.raw`\frac{\sin(x)}{x}=0`,
      interval: { start: '-10', end: '10', subdivisions: 256 },
    }));

    const domain = sectionText(result, 'Domain and Exclusions');
    const periodic = sectionText(result, 'Periodic Structure');
    const xExclusionCount = domain.match(/x\\ne 0/gu)?.length ?? 0;
    const searchDiagnosticExclusionCount =
      sectionText(result, 'Search Diagnostics').match(/x\\ne 0/gu)?.length ?? 0;

    expect(xExclusionCount).toBe(1);
    expect(searchDiagnosticExclusionCount).toBeLessThanOrEqual(1);
    expect(domain).not.toContain('Periodic carrier detected');
    expect(periodic).toContain('Sin(x) carrier repeats every about');
    expectApproxRoot(result, -Math.PI);
    expectApproxRoot(result, Math.PI);
  });

  it('keeps mixed algebraic-trig interval output from putting periodic carriers in domain facts', () => {
    const result = expectSuccess(solve({
      equationLatex: String.raw`x^2+\sin(x)=2`,
      interval: { start: '-10', end: '10', subdivisions: 256 },
    }));

    expect(sectionText(result, 'Domain and Exclusions')).not.toContain('Periodic carrier detected');
    expect(sectionText(result, 'Periodic Structure')).toContain('Sin(x) carrier repeats every about');
    expect(sectionText(result, 'Numeric Confidence')).not.toContain('Higher precision recommended');
    expectApproxRoot(result, -1.728466);
    expectApproxRoot(result, 1.06155);
  });

  it('separates tangent pole exclusions from periodic structure', () => {
    const result = expectSuccess(solve({
      equationLatex: String.raw`\tan(x)=1`,
      interval: { start: '0', end: '10', subdivisions: 256 },
    }));

    expect(sectionText(result, 'Domain and Exclusions')).toContain(String.raw`\cos\left(x\right)\ne 0`);
    expect(sectionText(result, 'Domain and Exclusions')).not.toContain('Tan(x) carrier repeats');
    expect(sectionText(result, 'Periodic Structure')).toContain('Tan(x) carrier repeats every about');
    expectApproxRoot(result, Math.PI / 4);
  });

  it('does not claim accepted candidate validation when no interval roots validate', () => {
    const result = expectError(solve({
      equationLatex: String.raw`\tan(x)=1`,
      interval: { start: '-10', end: '10', subdivisions: 256 },
      angleUnit: 'deg',
    }));

    expect(sectionText(result, 'Numeric Confidence')).not.toContain('Candidate roots validated');
    expect(result.error).toContain('No bracketed or near-zero real roots');
  });

  it('keeps log/denominator facts, probes, and extraneous pole candidates in their own cards', () => {
    const result = expectSuccess(solve({
      equationLatex: String.raw`\ln(x-1)+\frac{1}{x-2}=3`,
      interval: { start: '1.1', end: '25', subdivisions: 256 },
    }));

    expect(sectionText(result, 'Domain and Exclusions')).toContain('x-1 > 0');
    expect(sectionText(result, 'Domain and Exclusions')).toContain(String.raw`x-2\ne 0`);
    expect(sectionText(result, 'Domain Probe')).toContain('Probe set:');
    expect(sectionText(result, 'Extraneous Solutions')).toContain('Candidate approximately 2');
    expectApproxRoot(result, 2.372685);
    expectApproxRoot(result, 20.00011, 1e-4);
  });

  it('keeps clean square-root domain output from adding scary precision warnings', () => {
    const result = expectSuccess(solve({
      equationLatex: String.raw`\sqrt{x+1}=2`,
      interval: { start: '-2', end: '5', subdivisions: 128 },
    }));

    expect(sectionText(result, 'Domain and Exclusions')).toContain(String.raw`x+1\ge 0`);
    expect(allDetails(result)).not.toContain('Higher precision recommended');
    expectApproxRoot(result, 3);
  });

  it('puts absolute-value split points in Piecewise Breakpoints, not domain exclusions', () => {
    const result = expectSuccess(solve({
      equationLatex: String.raw`\left|x-2\right|=3`,
      interval: { start: '-100', end: '100', subdivisions: 256 },
    }));

    expect(sectionText(result, 'Piecewise Breakpoints')).toContain('x=2');
    expect(sectionText(result, 'Domain and Exclusions')).not.toContain('x=2');
    expectApproxRoot(result, -1);
    expectApproxRoot(result, 5);
  });

  it('shows only solved piecewise breakpoint points when interval segmentation proves them', () => {
    const result = expectSuccess(solve({
      equationLatex: String.raw`\left|x-1\right|+\left|x+1\right|=4`,
      interval: { start: '-10', end: '10', subdivisions: 256 },
    }));
    const breakpoints = sectionText(result, 'Piecewise Breakpoints');

    expect(breakpoints).toContain('x=-1');
    expect(breakpoints).toContain('x=1');
    expect(breakpoints).not.toContain('x-1');
    expect(breakpoints).not.toContain('x+1');
    expectApproxRoot(result, -2);
    expectApproxRoot(result, 2);
  });

  it('keeps repeated-root interval output deduped to one representative per root', () => {
    const result = expectSuccess(solve({
      equationLatex: String.raw`\left(x-1\right)^3\left(x+2\right)^2=0`,
      interval: { start: '-5', end: '5', subdivisions: 256 },
    }));

    expect(numericRoots(result)).toHaveLength(2);
    expectApproxRoot(result, -2);
    expectApproxRoot(result, 1, 2e-3);
  });

  it('accepts rational roots while keeping pole candidates extraneous', () => {
    const result = expectSuccess(solve({
      equationLatex: String.raw`\frac{x^2-4}{x-2}=0`,
      interval: { start: '-5', end: '5', subdivisions: 256 },
    }));

    expectApproxRoot(result, -2);
    expect(numericRoots(result).some((root) => Math.abs(root - 2) <= 1e-5)).toBe(false);
    expect(sectionText(result, 'Domain and Exclusions')).toContain(String.raw`x-2\ne 0`);
    expect(sectionText(result, 'Extraneous Solutions')).toContain('Candidate approximately 2');
  });

  it('shows no roots plus clear pole evidence for pure reciprocal zero equations', () => {
    const result = expectError(solve({
      equationLatex: String.raw`\frac{1}{x-2}=0`,
      interval: { start: '-10', end: '10', subdivisions: 256 },
    }));

    expect(sectionText(result, 'Domain and Exclusions')).toContain(String.raw`x-2\ne 0`);
    expect(result.error).toContain('No real solutions');
  });

  it('keeps exact periodic output readable while solve notes collapse by display policy', () => {
    const result = expectSuccess(solve({
      equationLatex: String.raw`\tan(\sin(\ln(x)+1))=1`,
    }));
    const syntheticSolveNote = buildDisplayBlocks({
      ...result,
      detailSections: [
        { title: 'Solve Note', lines: ['Composition branch: reduced carrier.', 'Periodic family: generated branches.'] },
      ],
    }).find((block) => block.label === 'Solve Note');

    expect(syntheticSolveNote).toMatchObject({
      kind: 'detail',
      defaultCollapsed: true,
    });
    expect(result.exactLatex ?? '').toContain(String.raw`\exp`);
  });
});
