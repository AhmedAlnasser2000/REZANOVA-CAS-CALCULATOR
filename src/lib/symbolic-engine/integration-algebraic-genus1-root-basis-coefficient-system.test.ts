import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { buildAlgebraicGenus1RootBasisCoefficientSystem } from './integration/algebraic-genus1/root-basis-coefficient-system';

const ce = new ComputeEngine();

function system(latex: string, variable = 'x') {
  return buildAlgebraicGenus1RootBasisCoefficientSystem(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = system(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected root-basis coefficient system for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.equationLatex,
    result.solvedCoefficientLatex ?? '',
    ...result.unknowns.flatMap((unknown) => [
      unknown.id,
      unknown.basisKind,
      unknown.coefficientFieldLatex,
      unknown.role,
    ]),
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

describe('algebraic genus-1 root-basis coefficient system', () => {
  it('records the solved first-kind coefficient for reciprocal radicals', () => {
    const result = success('\\frac{1}{\\sqrt{x^3-x}}');

    expect(result.status).toBe('first-kind-coefficient-solved');
    expect(result.unknowns).toEqual([]);
    expect(result.requiredBasisKinds).toEqual(['first-kind']);
    expect(result.solvedCoefficientLatex).toContain('\\sqrt{\\alpha_{3}-\\alpha_{1}}');
    expect(result.equationLatex).toContain('K_F');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('records the linear elliptic-basis system for radical pullbacks', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('linear-basis-system-required');
    expect(result.requiredBasisKinds).toEqual([
      'first-kind',
      'second-kind',
      'third-kind',
    ]);
    expect(result.unknowns.map((unknown) => unknown.id)).toEqual([
      'F',
      'E',
      '\\Pi_p',
    ]);
    expect(result.equationLatex).toContain('K_E');
    expect(result.equationLatex).toContain('K_{\\Pi}');
    expect(text(result)).toContain('\\mathbb{Q}');
    expect(text(result)).toContain('\\alpha_{3}');
  });

  it('records the Hermite-plus-basis system for rational-in-radical pullbacks', () => {
    const result = success('\\frac{x+1}{\\sqrt{x^3-x}}');

    expect(result.status).toBe('hermite-plus-basis-system-required');
    expect(result.requiredBasisKinds).toContain('rational-log-residual');
    expect(result.unknowns.map((unknown) => unknown.id)).toEqual([
      'S',
      'L',
      'F',
      'E',
      '\\Pi_p',
    ]);
    expect(result.equationLatex).toContain('dS+L');
  });

  it('threads selected variables through stop and success evidence', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.status).toBe('linear-basis-system-required');
    expect(text(result)).toContain('Live adoption waits');
  });

  it('stops when root Legendre pullback profiling is not supported', () => {
    const result = system('\\sqrt{x^3+x+1}');

    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'pullback-profile-stop',
    });
    if (result.kind === 'stop') {
      expect(result.detail).toContain('complex-pair');
    }
  });
});
