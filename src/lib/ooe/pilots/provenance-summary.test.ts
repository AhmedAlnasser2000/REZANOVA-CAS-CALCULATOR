import { describe, expect, it } from 'vitest';
import { summarizeOoeProvenanceDisplayOutcome } from './provenance-summary';

describe('OOE provenance output summary seam', () => {
  it('summarizes DisplayOutcome payloads without exposing diagnostics internals to app runtime', () => {
    expect(summarizeOoeProvenanceDisplayOutcome({
      kind: 'success',
      title: 'Equation',
      exactLatex: 'x=1',
      warnings: ['domain checked'],
      exactSupplementLatex: ['x \\ne 0'],
      resultOrigin: 'equation',
      detailSections: [{ title: 'Steps', lines: [] }],
    })).toMatchObject({
      kind: 'success',
      title: 'Equation',
      warningsCount: 1,
      resultOrigin: 'equation',
      hasExactLatex: true,
      exactLatexLength: 3,
      exactSupplementCount: 1,
      detailSectionTitles: ['Steps'],
    });
  });
});
