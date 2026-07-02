import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { buildAlgebraicGenus1RootBasisCoefficientProof } from './integration/algebraic-genus1/root-basis-coefficient-obligations';
import { buildAlgebraicGenus1RootLegendreData } from './integration/algebraic-genus1/root-legendre-data';

const ce = new ComputeEngine();

function proof(latex: string, variable = 'x') {
  const rootData = buildAlgebraicGenus1RootLegendreData(ce.parse(latex).json, variable);
  return buildAlgebraicGenus1RootBasisCoefficientProof(rootData);
}

function success(latex: string, variable = 'x') {
  const result = proof(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected root-basis coefficient obligations for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.coefficientFieldLatex,
    result.firstKindCoefficientLatex,
    result.secondKindCoefficientTemplateLatex,
    result.thirdKindCoefficientTemplateLatex,
    ...result.obligations.flatMap((obligation) => [
      obligation.kind,
      obligation.status,
      obligation.kernelLatex,
      obligation.coefficientScopeLatex,
      obligation.note,
    ]),
    ...result.detailSections.flatMap((section) => [
      section.title,
      ...section.lines,
      ...((section as { lineParts?: unknown[][] }).lineParts ?? []).flat().map(String),
    ]),
  ].join('\n');
}

describe('algebraic genus-1 root-basis coefficient obligations', () => {
  it('records exact coefficient obligations for a three-real-root cubic chart', () => {
    const result = success('\\frac{1}{\\sqrt{x^3-x}}');

    expect(result.dataKind).toBe('cubic-three-real-roots');
    expect(result.proofStatus).toBe('root-basis-coefficients-ready');
    expect(result.coefficientFieldLatex).toContain('\\mathbb{Q}');
    expect(result.coefficientFieldLatex).toContain('\\alpha_{1}');
    expect(result.coefficientFieldLatex).toContain('\\sin^2\\phi');
    expect(result.firstKindCoefficientLatex).toContain('\\frac{2}{\\sqrt');
    expect(result.secondKindCoefficientTemplateLatex).toContain('A\\left(\\sin^2\\phi\\right)');
    expect(result.thirdKindCoefficientTemplateLatex).toContain('n=n(p)');
    expect(result.obligations).toHaveLength(3);
    expect(result.obligations.map((obligation) => obligation.kind)).toEqual([
      'first-kind',
      'second-kind',
      'third-kind',
    ]);
    expect(result.obligations[0].status).toBe('explicit-coefficient');
    expect(result.obligations[1].status).toBe('basis-template-ready');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('records exact coefficient obligations for a four-real-root quartic chart', () => {
    const result = success('\\frac{1}{\\sqrt{(x-1)(x-2)(x-3)(x-4)}}');

    expect(result.dataKind).toBe('quartic-four-real-roots');
    expect(result.coefficientFieldLatex).toContain('\\alpha_{4}');
    expect(result.firstKindCoefficientLatex).toContain('\\alpha_{4}-\\alpha_{2}');
    expect(result.obligations[2].kernelLatex).toContain('1-n\\sin^2\\phi');
    expect(text(result)).toContain('third-kind: basis-template-ready');
  });

  it('uses the selected variable while keeping root-field coefficient evidence', () => {
    const result = success('\\frac{1}{\\sqrt{t^3-t}}', 't');

    expect(result.variable).toBe('t');
    expect(result.coefficientFieldLatex).toContain('\\alpha_{1}');
    expect(result.firstKindCoefficientLatex).toContain('\\alpha_{3}-\\alpha_{1}');
  });

  it('stops when the named-root Legendre chart is not supported', () => {
    const result = proof('\\frac{1}{\\sqrt{x^3+x+1}}');

    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'root-legendre-stop',
    });
  });
});
