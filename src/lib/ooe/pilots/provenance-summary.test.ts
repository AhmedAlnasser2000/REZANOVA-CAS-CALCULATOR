import { describe, expect, it } from 'vitest';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
  createCanonicalRuntimeResult,
} from '../../result-contract';
import { summarizeOoeProvenanceCanonicalOutcome } from './provenance-summary';

describe('OOE provenance output summary seam', () => {
  it('summarizes canonical payloads without exposing diagnostics internals to app runtime', () => {
    expect(summarizeOoeProvenanceCanonicalOutcome(createCanonicalRuntimeResult(
      buildCanonicalResultDocumentFromProducer({
        outcomeKind: 'success',
        title: 'Equation',
        primaryMath: canonicalMathValue('x=1'),
        warnings: ['domain checked'],
        supplements: ['x \\ne 0'],
        detailSections: [{ title: 'Steps', lines: [] }],
        metadata: { resultOrigin: 'symbolic' },
      })))).toMatchObject({
      kind: 'success',
      title: 'Equation',
      warningsCount: 1,
      resultOrigin: 'symbolic',
      hasExactLatex: true,
      exactLatexLength: 3,
      exactSupplementCount: 1,
      detailSectionTitles: ['Steps'],
    });
  });
});
