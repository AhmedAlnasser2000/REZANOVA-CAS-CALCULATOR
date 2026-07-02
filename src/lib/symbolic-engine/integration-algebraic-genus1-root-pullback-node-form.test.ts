import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { buildAlgebraicGenus1RootPullbackNodeForm } from './integration/algebraic-genus1/root-pullback-node-form';

const ce = new ComputeEngine();

function nodeForm(latex: string, variable = 'x') {
  return buildAlgebraicGenus1RootPullbackNodeForm(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = nodeForm(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected root-pullback node form for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.rootChartKind,
    result.chartVariableLatex,
    result.selectedVariableInChartLatex,
    result.dxDzLatex,
    result.parameterLatex,
    result.firstKindKernelLatex,
    result.secondKindKernelLatex,
    result.thirdKindKernelTemplateLatex,
    ...result.proofObligations,
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

describe('algebraic genus-1 root-pullback node form', () => {
  it('builds MathJSON chart evidence for three-real-root radical pullbacks', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('node-pullback-ready');
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(result.integrandShape).toBe('radical');
    expect(result.canPopulateCoefficientMatrix).toBe(true);
    expect(result.canAdoptLive).toBe(false);
    expect(result.chartVariableLatex).toBe('z=\\sin^2\\phi');
    expect(result.selectedVariableInChartNode).toEqual([
      'Divide',
      ['Add', 'alpha_3', ['Negate', ['Multiply', 'alpha_2', 'z']]],
      ['Add', 1, ['Negate', 'z']],
    ]);
    expect(result.firstKindKernelNode).toEqual([
      'Divide',
      1,
      [
        'Sqrt',
        [
          'Add',
          1,
          [
            'Negate',
            [
            'Multiply',
            'z',
            ['Divide', ['Add', 'alpha_2', ['Negate', 'alpha_1']], ['Add', 'alpha_3', ['Negate', 'alpha_1']]],
          ],
          ],
        ],
      ],
    ]);
    expect(text(result)).toContain('MathJSON nodes');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('keeps reciprocal radicals evidence-only because the first-kind route is already live', () => {
    const result = success('\\frac{1}{\\sqrt{x^3-x}}');

    expect(result.integrandShape).toBe('reciprocal-radical');
    expect(result.canPopulateCoefficientMatrix).toBe(false);
    expect(result.readinessNotes.join('\n')).toContain('existing first-kind live route');
  });

  it('builds tan-half node evidence for complex-pair cubic charts', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.rootChartKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.chartVariableLatex).toContain('\\tan^2');
    expect(result.selectedVariableInChartNode).toEqual([
      'Add',
      'alpha_1',
      ['Multiply', 'A_alpha_1', 'z'],
    ]);
    expect(result.dxDzNode).toBe('A_alpha_1');
    expect(text(result)).toContain('beta');
  });

  it('threads arbitrary selected variables through node pullback evidence', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(result.canPopulateCoefficientMatrix).toBe(true);
  });

  it('stops cleanly outside the genus-1 root-pullback scope', () => {
    const result = nodeForm('\\sqrt{x^5+x+1}');

    expect(result.kind).toBe('stop');
    if (result.kind === 'stop') {
      expect(result.reason).toBe('pullback-profile-stop');
      expect(result.detail).toMatch(/genus|degree|radical/i);
    }
  });
});
