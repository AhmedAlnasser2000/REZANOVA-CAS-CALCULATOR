import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import type { DisplayDetailSection } from '../../types/calculator';
import { detailLineIntentAt } from '../display/result-detail-lines';
import {
  integralMethodDetail,
  integralSafetyDetail,
} from './engine/shared';
import { resolveInfiniteLimitHeuristic } from './engine/limit-heuristics';
import { evaluateCalculusLaplaceTransform } from './workspace/laplace';
import { evaluateCalculusLimit } from './workspace/limits';

const ce = new ComputeEngine();

function partValue(part: NonNullable<DisplayDetailSection['lineParts']>[number][number]) {
  return part.kind === 'math' ? part.latex : part.text;
}

function expectDeclaredSections(sections: readonly DisplayDetailSection[] | undefined) {
  expect(sections?.length).toBeGreaterThan(0);
  for (const section of sections ?? []) {
    section.lines.forEach((_line, index) => {
      expect(detailLineIntentAt(section, index)).not.toBe('undeclared');
    });
    if (section.lineParts) {
      expect(section.lineParts.map((row) => row.map(partValue).join(''))).toEqual(section.lines);
    }
  }
}

describe('Calculus detail intent', () => {
  it.each([
    ['variable mismatch', 'lim x -> infinity (3t^2+1)/(2t^2-5)'],
    ['unsupported route', 'lim x -> 0 floor(1/x)'],
    ['malformed piecewise row', 'lim x -> 0 piecewise(x if ; x^2 otherwise)'],
  ])('declares %s detail rows', (_label, requestLatex) => {
    const result = evaluateCalculusLimit({ requestLatex });
    expect(result.error).toBeDefined();
    expectDeclaredSections(result.detailSections);
  });

  it('types infinity conclusions from native heuristic evidence', () => {
    const result = resolveInfiniteLimitHeuristic(
      ce.parse('(x^2+1)/(2x^2-5)').json,
      'x',
      'posInfinity',
    );

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('Expected heuristic success');
    expectDeclaredSections(result.detailSections);
    expect(result.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '\\frac{1}{2}',
    });
  });

  it('keeps integral method and interval safety lines typed with exact compatibility text', () => {
    const method = integralMethodDetail(
      'No trusted symbolic antiderivative was available, so adaptive Simpson integration was used.',
      'The result remains labeled as numeric fallback.',
    );
    const safety = integralSafetyDetail({
      kind: 'unsafe',
      constraints: [{ kind: 'positive', expressionLatex: 'x' }],
      value: 0,
      violation: {
        constraint: { kind: 'positive', expressionLatex: 'x' },
        message: 'must stay positive',
      },
    }, 0, 2);

    expectDeclaredSections([method, safety]);
    expect(safety.lines).toEqual([
      'Stopped before integration because x=0 must stay positive.',
      'x failed a real-domain constraint on [0, 2].',
    ]);
    expect(safety.lineParts?.flat()).toContainEqual({ kind: 'math', latex: 'x=0' });
    expect(safety.lineParts?.flat()).toContainEqual({ kind: 'math', latex: '[0, 2]' });
  });

  it('declares supported and controlled Laplace table readback', () => {
    const supported = evaluateCalculusLaplaceTransform({ bodyLatex: '\\sin(3t)' });
    const unsupported = evaluateCalculusLaplaceTransform({ bodyLatex: 't\\sin(t)' });

    expectDeclaredSections(supported.detailSections);
    expectDeclaredSections(unsupported.detailSections);
  });
});
