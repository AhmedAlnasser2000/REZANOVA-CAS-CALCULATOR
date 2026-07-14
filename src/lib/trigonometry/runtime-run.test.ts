import { describe, expect, it } from 'vitest';
import type {
  CanonicalResultDocumentV2,
  VersionedResultProducerDraft,
} from '../../types/calculator';
import { collectCanonicalMathLeaves } from '../result-contract/mathjson-coverage';
import { buildTrigonometryModeRunPayload } from './runtime-run';

function requireV2Document(
  result: VersionedResultProducerDraft,
): CanonicalResultDocumentV2 {
  if (result.kind === 'prompt' || result.canonicalResult?.version !== 2) {
    throw new Error('Expected a V2 canonical result document.');
  }
  return result.canonicalResult;
}

describe('Trigonometry V2 request evidence', () => {
  it.each([
    ['30', 'deg', 'rad'],
    ['3.141592653589793', 'rad', 'grad'],
    ['200', 'grad', 'deg'],
  ] as const)(
    'stores typed %s %s to %s conversion evidence',
    (value, fromUnit, toUnit) => {
      const result = buildTrigonometryModeRunPayload({
        inputLatex: `angleConvert(value=${value}, from=${fromUnit}, to=${toUnit})`,
        screenHint: 'angleConvert',
        angleUnit: fromUnit,
      });

      expect(result.outcome.kind).toBe('success');
      const document = requireV2Document(result.outcome);
      expect(document.request).toMatchObject({
        kind: 'angle-conversion',
        presentationLatex: `angleConvert(value=${value},from=${fromUnit},to=${toUnit})`,
        value: { canonicalLatex: value },
        fromUnit,
        toUnit,
      });
      expect(collectCanonicalMathLeaves(document).every((leaf) => leaf.value.mathJson !== undefined))
        .toBe(true);
    },
  );

  it('stores typed right-triangle quantities beside the existing presentation', () => {
    const result = buildTrigonometryModeRunPayload({
      inputLatex: 'rightTriangle(a=3,b=4,c=?,A=?,B=?)',
      screenHint: 'rightTriangle',
      angleUnit: 'deg',
    });

    expect(result.outcome.kind).toBe('success');
    if (result.outcome.kind === 'success') {
      expect(result.outcome.exactLatex).toContain('c=5');
    }
    const document = requireV2Document(result.outcome);
    expect(document.request).toEqual({
      kind: 'right-triangle',
      presentationLatex: 'rightTriangle(a=3,b=4,c=?,A=?,B=?)',
      angleUnit: 'deg',
      knownQuantities: [
        { kind: 'side', name: 'a', value: { canonicalLatex: '3', mathJson: 3 } },
        { kind: 'side', name: 'b', value: { canonicalLatex: '4', mathJson: 4 } },
      ],
    });
    expect(collectCanonicalMathLeaves(document).every((leaf) => leaf.value.mathJson !== undefined))
      .toBe(true);
  });

  it('keeps sine-rule and cosine-rule producers on the frozen V1 route', () => {
    const cases = [
      {
        inputLatex: 'sineRule(a=7, b=10, A=30)',
        screenHint: 'sineRule' as const,
      },
      {
        inputLatex: 'cosineRule(a=5, b=7, C=60)',
        screenHint: 'cosineRule' as const,
      },
    ];

    for (const request of cases) {
      const result = buildTrigonometryModeRunPayload({
        ...request,
        angleUnit: 'deg',
      });
      expect(result.outcome.kind, request.screenHint).toBe('success');
      expect(result.outcome.kind === 'prompt'
        ? undefined
        : result.outcome.canonicalResult?.version).toBe(1);
    }
  });

  it('keeps an invalid selected conversion as a controlled V2 error without fallback', () => {
    const result = buildTrigonometryModeRunPayload({
      inputLatex: 'angleConvert(value=abc,from=deg,to=rad)',
      screenHint: 'angleConvert',
      angleUnit: 'deg',
    });

    expect(result.outcome.kind).toBe('error');
    if (result.outcome.kind !== 'error') {
      throw new Error('Expected a controlled conversion error.');
    }
    expect(result.outcome.error).toContain('numeric angle value');
    const document = requireV2Document(result.outcome);
    expect(document).toMatchObject({
      version: 2,
      outcomeKind: 'error',
      title: 'Angle Convert',
    });
    expect(document.request).toBeUndefined();
  });
});
