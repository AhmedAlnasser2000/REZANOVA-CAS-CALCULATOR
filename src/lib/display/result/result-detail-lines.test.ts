import { describe, expect, it } from 'vitest';
import {
  detailLineIntentAt,
  mathPart,
  mixedDetailSection,
  resolveDetailLinePresentation,
  solveSummaryDetailLines,
  solveSummaryFromParts,
  textDetailSection,
  textPart,
} from './result-detail-lines';

describe('detail segment contract', () => {
  it('derives compatibility lines from typed mixed rows', () => {
    const section = mixedDetailSection('Branches', [
      [textPart('Root: '), mathPart(String.raw`x=\sqrt{2}`)],
    ]);

    expect(section).toEqual({
      title: 'Branches',
      lines: [String.raw`Root: x=\sqrt{2}`],
      lineParts: [[textPart('Root: '), mathPart(String.raw`x=\sqrt{2}`)]],
    });
    expect(detailLineIntentAt(section, 0)).toBe('typed-parts');
    expect(detailLineIntentAt(textDetailSection('Note', ['Prose only.']), 0))
      .toBe('explicit-text');
  });

  it('derives compatibility solve-summary text from canonical typed parts', () => {
    const summary = solveSummaryFromParts([
      [textPart('Reduced carrier: '), mathPart('u=x^2')],
      [textPart('Generated equation: '), mathPart('u=1')],
    ]);

    expect(summary.solveSummaryText).toBe('Reduced carrier: u=x^2; Generated equation: u=1');
    expect(solveSummaryDetailLines(
      summary.solveSummaryText,
      summary.solveSummaryParts,
    )).toEqual([
      { line: 'Reduced carrier: u=x^2', parts: [textPart('Reduced carrier: '), mathPart('u=x^2')] },
      { line: 'Generated equation: u=1', parts: [textPart('Generated equation: '), mathPart('u=1')] },
    ]);
  });

  it('resolves typed parts, explicit kind, and legacy inference in that order', () => {
    expect(resolveDetailLinePresentation({
      line: 'Generated equation: x=1',
      lineKind: 'math',
      parts: [textPart('Declared prose')],
    })).toMatchObject({ source: 'typed-parts', kind: 'parts' });

    expect(resolveDetailLinePresentation({
      line: 'Generated equation: x=1',
      lineKind: 'text',
    })).toEqual({ source: 'explicit-kind', kind: 'text' });

    expect(resolveDetailLinePresentation({
      line: 'x=1',
      lineKind: 'math',
      parts: [],
    })).toEqual({ source: 'explicit-kind', kind: 'math' });

    expect(resolveDetailLinePresentation({
      line: 'Generated equation: x=1',
    })).toMatchObject({ source: 'legacy-inference', kind: 'parts' });

    expect(resolveDetailLinePresentation({
      line: 'Generated equation: x=1',
      allowLegacyInference: false,
    })).toEqual({ source: 'undeclared', kind: 'text' });
  });
});
