import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1SecondKindBasisReadiness } from './integration/algebraic-genus1/second-kind-basis-readiness';

const ce = new ComputeEngine();

function readiness(latex: string, variable = 'x') {
  return buildAlgebraicGenus1SecondKindBasisReadiness(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = readiness(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected second-kind readiness for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.preferredBranchLatex,
    result.amplitudeLatex,
    result.parameterLatex,
    result.rationalCoefficientLatex,
    result.coefficientFieldLatex,
    result.firstKindBasisLatex,
    result.secondKindBasisLatex,
    result.thirdKindTemplateLatex,
    result.basisEquationLatex,
    result.correctionTemplateLatex,
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

describe('algebraic genus-1 second-kind basis readiness', () => {
  it('builds a structured F/E/Pi basis equation for exact cubic radical pullbacks', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.canAdoptLive).toBe(false);
    expect(result.preferredBranchLatex).toBe('x>\\alpha_{3}');
    expect(result.secondKindBasisLatex).toContain('dE');
    expect(result.basisEquationLatex).toContain('C_E');
    expect(result.basisEquationLatex).toContain('dS');
    expect(result.correctionTemplateLatex).toContain('S(\\sin^2\\phi)');
    expect(text(result)).toContain('explicit F/E/Pi plus rational-correction basis equation');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('threads selected variables through second-kind readiness', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.amplitudeLatex).toContain('t-\\alpha_{3}');
    expect(result.basisEquationLatex).toContain('C_F');
  });

  it('does not claim reciprocal radicals as second-kind readiness', () => {
    expect(readiness('\\frac{1}{\\sqrt{x^3-x}}')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-integrand-shape',
    });
  });

  it('builds second-kind readiness for one-real-root complex-pair radical charts', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.canAdoptLive).toBe(false);
    expect(result.rootChartKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.preferredBranchLatex).toContain('x>\\alpha_{1}');
    expect(result.rationalCoefficientLatex).toContain('A_{\\alpha_{1}}');
    expect(text(result)).toContain('\\beta_{\\alpha_{1}}');
  });

  it('keeps raw radical integration deferred until the basis equation is solved', () => {
    const result = resolveSymbolicIntegralFromLatex('\\sqrt{x^3-x}');

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error).toContain('second-kind elliptic residual');
    }
  });
});
