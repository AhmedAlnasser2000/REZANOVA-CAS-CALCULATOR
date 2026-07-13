import { describe, expect, it } from 'vitest';
import type { CalculusScreen, DisplayOutcome } from '../../../types/calculator';
import { projectDisplayOutcomeToCanonicalResult } from '../../result-contract';
import {
  createCalculusResultOutcome,
  hasNativeCalculusResultDocument,
} from './result-document';

describe('Calculus result document producer', () => {
  it('covers every result screen while keeping navigation screens control-only', () => {
    const nativeScreens = [
      'limit',
      'finiteLimit',
      'infiniteLimit',
      'indefiniteIntegral',
      'definiteIntegral',
      'improperIntegral',
      'laplace',
      'partialDerivative',
      'derivative',
      'derivativePoint',
      'implicitDerivative',
      'maclaurin',
      'taylor',
      'odeFirstOrder',
      'odeSecondOrder',
      'odeNumericIvp',
    ] satisfies CalculusScreen[];
    const navigationScreens = [
      'home',
      'derivativesHome',
      'integralsHome',
      'limitsHome',
      'seriesHome',
      'partialsHome',
      'odeHome',
    ] satisfies CalculusScreen[];

    expect(nativeScreens.every(hasNativeCalculusResultDocument)).toBe(true);
    expect(navigationScreens.some(hasNativeCalculusResultDocument)).toBe(false);
  });

  it('builds native proof-aware Limit truth from typed fields', () => {
    const input: Extract<DisplayOutcome, { kind: 'success' }> = {
      kind: 'success',
      title: 'Finite Limit',
      exactLatex: '-\\infty',
      approxText: '-Infinity',
      warnings: [],
      resultOrigin: 'rule-based-symbolic',
      detailSections: [{
        title: 'Side Behavior',
        lines: ['Left calculation: -\\infty.'],
        lineParts: [[
          { kind: 'text', text: 'Left calculation: ' },
          { kind: 'math', latex: '-\\infty' },
          { kind: 'text', text: '.' },
        ]],
      }],
      variableSubstitutions: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
    };

    const outcome = createCalculusResultOutcome(input);
    const compatibility = projectDisplayOutcomeToCanonicalResult(input);
    expect(compatibility.ok).toBe(true);
    if (!compatibility.ok) return;
    expect(outcome.canonicalResult).toEqual(compatibility.document);
    expect(structuredClone(outcome.canonicalResult)).toEqual(outcome.canonicalResult);
  });

  it('keeps typed controlled-stop and solve-summary evidence', () => {
    const outcome = createCalculusResultOutcome({
      kind: 'error',
      title: 'Limit',
      error: 'Left and right behavior do not agree near the target.',
      warnings: [],
      detailSections: [{
        title: 'Why This Limit Fails',
        lines: ['The sided limits disagree.'],
        lineKind: 'text',
      }],
    });
    expect(outcome.canonicalResult?.outcomeKind).toBe('error');
    expect(outcome.canonicalResult?.details?.[0]?.title).toBe('Why This Limit Fails');

    const summarized = createCalculusResultOutcome({
      kind: 'success',
      title: 'Limit',
      exactLatex: '1',
      warnings: [],
      solveSummaryParts: [[{ kind: 'text', text: 'Proved by the bounded limit route.' }]],
    });
    expect(summarized.canonicalResult?.summaries?.solve).toHaveLength(1);
  });
});
