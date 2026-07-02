import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { buildAlgebraicGenus1RootPullbackRationalForm } from './integration/algebraic-genus1/root-pullback-rational-form';

const ce = new ComputeEngine();

function rationalForm(latex: string, variable = 'x') {
  return buildAlgebraicGenus1RootPullbackRationalForm(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = rationalForm(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected root pullback rational form for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.chartVariableLatex,
    result.selectedVariableInChartLatex,
    result.coefficientFieldLatex,
    result.kernelLatex,
    result.rationalCoefficientLatex,
    result.pullbackIdentityLatex,
    ...result.readinessNotes,
    ...result.detailSections.flatMap((section) => [
      section.title,
      ...section.lines,
      ...((section as { lineParts?: unknown[][] }).lineParts ?? [])
        .flat()
        .map(String),
    ]),
  ].join('\n');
}

describe('algebraic genus-1 root pullback rational form', () => {
  it('records a constant first-kind rational coefficient for reciprocal radicals', () => {
    const result = success('\\frac{1}{\\sqrt{x^3-x}}');

    expect(result.status).toBe('constant-first-kind-rational-form');
    expect(result.chartVariableLatex).toBe('z=\\sin^2\\phi');
    expect(result.rationalCoefficientLatex).toContain('\\sqrt{\\alpha_{3}-\\alpha_{1}}');
    expect(result.pullbackIdentityLatex).toContain('\\frac{d\\phi}');
    expect(text(result)).toContain('live first-kind route');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('records the rational coefficient to solve for radical pullbacks', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('basis-coefficient-rational-form');
    expect(result.rationalCoefficientLatex).toContain('P\\left(');
    expect(result.rationalCoefficientLatex).toContain('\\sqrt{\\alpha_{3}-\\alpha_{1}}');
    expect(result.rationalCoefficientLatex).not.toContain('C_F');
    expect(result.pullbackIdentityLatex).toContain('F/E/\\Pi');
    expect(text(result)).toContain('\\mathbb{Q}');
    expect(text(result)).toContain('\\alpha_{3}');
  });

  it('records the Hermite rational coefficient for rational-in-radical pullbacks', () => {
    const result = success('\\frac{x+1}{\\sqrt{x^3-x}}');

    expect(result.status).toBe('hermite-rational-form');
    expect(result.rationalCoefficientLatex).toContain('R\\left(');
    expect(result.rationalCoefficientLatex).toContain('\\sqrt{P');
    expect(result.rationalCoefficientLatex).not.toContain('C_F');
    expect(result.pullbackIdentityLatex).toContain('dS+L');
  });

  it('threads selected variables through the chart evidence', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.selectedVariableInChartLatex).toContain('\\alpha_{3}');
    expect(text(result)).toContain('basis coefficient solving');
  });

  it('stops when coefficient-system evidence cannot be built', () => {
    const result = rationalForm('\\sqrt{x^3+x+1}');

    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'coefficient-system-stop',
    });
    if (result.kind === 'stop') {
      expect(result.detail).toContain('complex-pair');
    }
  });
});
