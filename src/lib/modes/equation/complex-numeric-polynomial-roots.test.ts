import { describe, expect, it } from 'vitest';
import type { ResultProducerDraft } from '../../../types/calculator';
import { runEquationMode } from '../equation';
import { collectOutcomeText, makeRequest } from './test-support';
import { tryComplexNumericPolynomialFallback } from './complex-numeric-polynomial-roots';

function solve(
  equationLatex: string,
  extra: Partial<Parameters<typeof runEquationMode>[0]> = {},
) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'complex',
    angleUnit: 'rad',
    ...extra,
  });
}

const unsupportedExactOutcome: ResultProducerDraft = {
  kind: 'error',
  title: 'Solve',
  error: 'This equation is outside the supported exact symbolic solve families.',
  warnings: [],
};

describe('Equation Complex numeric polynomial roots', () => {
  it('returns visible approximate Complex roots after exact symbolic routes miss', () => {
    const result = solve('x^6+x+1=0');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Complex numeric polynomial success');
    }
    expect(result.solutionKind).toBe('approximate-numeric');
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.answerDomain).toBe('complex');
    expect(result.numericMethod).toBe('Complex numeric polynomial roots');
    expect(result.branchReadback?.label).toBe('Numeric Complex Roots');
    expect(result.branchReadback?.branchesLatex).toHaveLength(6);
    const text = collectOutcomeText(result);
    expect(text).toContain('No supported exact form was found; showing validated approximate complex roots.');
    expect(text).toContain('Evidence posture: hardened numeric evidence, not a formal proof certificate.');
    expect(text).toContain('Numeric scope: global-polynomial.');
    expect(text).toContain('Verification status: global-polynomial.');
    expect(text).toContain('Branch policy: not-applicable.');
    expect(text).toContain('Completeness: all distinct roots of the degree-capped polynomial are considered.');
    expect(text).toContain('Expected polynomial root slots: 6.');
    expect(text).toContain('Estimated root slots accounted: 6.');
    expect(text).toContain('Root-slot accounting: all polynomial root slots are represented after multiplicity estimates.');
    expect(text).toContain('Maximum backward-error estimate:');
    expect(text).toContain('Smallest derivative magnitude at displayed roots:');
    expect(text).toContain('Root engine: aberth-ehrlich');
    expect(text).not.toContain('Real Cardano Cases');
    expect(text).not.toContain('Real Ferrari Cases');
    expect(text).not.toContain('RootOf');
  });

  it('includes both real and non-real roots in Complex On numeric fallback', () => {
    const result = solve('x^5-x=1');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Complex numeric polynomial success');
    }
    expect(result.branchReadback?.branchesLatex).toHaveLength(5);
    expect(result.branchReadback?.branchesLatex.some((branch) => branch.includes('i'))).toBe(true);
    expect(result.approxText).toContain('i');
  });

  it('honors polar and cis Complex output forms for approximate roots', () => {
    const polar = solve('x^6+x+1=0', { complexExactForm: 'polar' });
    const cis = solve('x^6+x+1=0', { complexExactForm: 'cis' });

    expect(polar.kind).toBe('success');
    expect(cis.kind).toBe('success');
    if (polar.kind !== 'success' || cis.kind !== 'success') {
      throw new Error('Expected formatted Complex numeric polynomial successes');
    }
    expect(polar.exactLatex).toContain('\\angle');
    expect(polar.approxText).toContain('angle');
    expect(cis.exactLatex).toContain('\\operatorname{cis}');
    expect(cis.approxText).toContain('cis');
  });

  it('preserves rational denominator evidence after cancelled poles', () => {
    const result = tryComplexNumericPolynomialFallback({
      equationLatex: String.raw`\frac{x^7-x}{x}=0`,
      equationSolveTarget: 'x',
      angleUnit: 'rad',
      complexExactForm: 'rectangular',
      sharedOutcome: unsupportedExactOutcome,
    });

    expect(result?.kind).toBe('success');
    if (!result || result.kind !== 'success') {
      throw new Error('Expected Complex numeric rational success');
    }
    expect(result.numericMethod).toBe('Complex numeric rational roots');
    expect(result.branchReadback?.branchesLatex).toHaveLength(6);
    expect(result.branchReadback?.branchesLatex).not.toContain('0');
    expect(result.detailSections?.map((section) => section.title)).toContain('Domain and Exclusions');
    const text = collectOutcomeText(result);
    expect(text).toContain('Branch policy: pole-aware.');
    expect(text).toContain('Completeness: all distinct roots of the cleared numerator are considered');
    expect(text).toContain('x\\ne 0');
  });

  it('reports numeric multiplicity evidence and decimal revalidation for clustered Complex roots', () => {
    const result = tryComplexNumericPolynomialFallback({
      equationLatex: 'x^3-3*x+2=0',
      equationSolveTarget: 'x',
      angleUnit: 'rad',
      complexExactForm: 'rectangular',
      sharedOutcome: unsupportedExactOutcome,
    });

    expect(result?.kind).toBe('success');
    if (!result || result.kind !== 'success') {
      throw new Error('Expected Complex repeated-root numeric success');
    }
    const text = collectOutcomeText(result);
    expect(result.branchReadback?.branchesLatex).toHaveLength(2);
    expect(text).toContain('Roots before dedupe: 3; after dedupe: 2.');
    expect(text).toContain('Estimated multiplicity near');
    expect(text).toContain('Multiplicity estimates are numeric cluster evidence');
    expect(text).toContain('Precision escalation backend: decimal.js');
  });

  it('adds large-degree display guidance without replacing Aberth-Ehrlich', () => {
    const result = tryComplexNumericPolynomialFallback({
      equationLatex: 'x^{20}-1=0',
      equationSolveTarget: 'x',
      angleUnit: 'rad',
      complexExactForm: 'cis',
      sharedOutcome: unsupportedExactOutcome,
    });

    expect(result?.kind).toBe('success');
    if (!result || result.kind !== 'success') {
      throw new Error('Expected Complex large-degree numeric success');
    }
    expect(result.branchReadback?.branchesLatex).toHaveLength(20);
    const text = collectOutcomeText(result);
    expect(text).toContain('Large-degree root lists use progressive/capped branch rendering');
    expect(text).toContain('Root engine: aberth-ehrlich');
    expect(text).toContain('cis');
  });

  it('keeps exact Complex symbolic routes ahead of numeric fallback', () => {
    const result = solve('x^2+1=0');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected exact Complex success');
    }
    expect(result.solutionKind).not.toBe('approximate-numeric');
    expect(result.numericMethod).toBeUndefined();
    expect(collectOutcomeText(result)).not.toContain('No supported exact form was found');
  });
});
