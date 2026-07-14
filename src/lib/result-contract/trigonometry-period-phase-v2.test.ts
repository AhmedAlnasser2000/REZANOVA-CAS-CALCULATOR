import { describe, expect, it } from 'vitest';
import type { CanonicalResultDocumentV2 } from '../../types/calculator';
import { buildTrigonometryModeRunPayload } from '../trigonometry/runtime-run';
import { collectCanonicalMathLeaves } from './mathjson-coverage';

function periodPhaseDocument(inputLatex: string, angleUnit: 'deg' | 'rad' | 'grad') {
  const payload = buildTrigonometryModeRunPayload({
    inputLatex,
    screenHint: 'periodPhase',
    angleUnit,
  });
  if (payload.outcome.kind !== 'success' || payload.outcome.canonicalResult?.version !== 2) {
    throw new Error(`Expected successful Period & Phase V2 output for ${inputLatex}.`);
  }
  return {
    outcome: payload.outcome,
    document: payload.outcome.canonicalResult as CanonicalResultDocumentV2,
  };
}

describe('Trigonometry Period & Phase V2', () => {
  it.each([
    {
      carrier: 'sine',
      inputLatex: '2\\sin\\left(3x-\\pi\\right)+1',
      angleUnit: 'rad' as const,
      period: '\\frac{2\\pi}{3}',
      phaseShift: '\\frac{\\pi}{3}',
    },
    {
      carrier: 'cosine',
      inputLatex: '-3\\cos\\left(2x+90\\right)-4',
      angleUnit: 'deg' as const,
      period: '180^{\\circ}',
      phaseShift: '-45^{\\circ}',
    },
    {
      carrier: 'tangent',
      inputLatex: '\\tan\\left(2x-100\\right)',
      angleUnit: 'grad' as const,
      period: '100',
      phaseShift: '50',
    },
  ])(
    'stores $carrier equation, period, and phase as proven components',
    ({ inputLatex, angleUnit, period, phaseShift }) => {
      const { outcome, document } = periodPhaseDocument(inputLatex, angleUnit);
      expect(document.primary).toMatchObject({
        kind: 'period-phase',
        presentation: { primaryLatex: outcome.exactLatex },
        period: { canonicalLatex: period },
        phaseShift: { canonicalLatex: phaseShift },
      });
      if (document.primary?.kind !== 'period-phase') {
        throw new Error('Expected typed Period & Phase primary.');
      }
      expect(document.primary.normalizedEquation.canonicalLatex).toMatch(/^y=/u);
      expect(collectCanonicalMathLeaves(document).every((leaf) =>
        leaf.value.mathJson !== undefined)).toBe(true);
    },
  );

  it('keeps a symbolic affine phase on V2 without parsing presentation output', () => {
    const { document } = periodPhaseDocument('\\sin\\left(2x+a\\right)', 'rad');
    expect(document.primary).toMatchObject({
      kind: 'period-phase',
      phaseShift: { canonicalLatex: '-\\frac{+a}{2}' },
    });
  });
});
