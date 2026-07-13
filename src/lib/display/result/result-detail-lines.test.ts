import { describe, expect, it } from 'vitest';
import {
  detailLineIntentAt,
  mathPart,
  mergeSolveSummaries,
  mixedDetailSection,
  proseSolveSummary,
  resolveDetailLinePresentation,
  solveSummaryDetailLines,
  solveSummaryFromParts,
  solveSummaryPlainText,
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

  it('derives readable solve-summary text only from canonical typed parts', () => {
    const summary = solveSummaryFromParts([
      [textPart('Reduced carrier: '), mathPart('u=x^2')],
      [textPart('Generated equation: '), mathPart('u=1')],
    ]);

    expect(solveSummaryPlainText(summary)).toBe('Reduced carrier: u=x^2; Generated equation: u=1');
    expect(solveSummaryDetailLines(summary.solveSummaryParts)).toEqual([
      { line: 'Reduced carrier: u=x^2', parts: [textPart('Reduced carrier: '), mathPart('u=x^2')] },
      { line: 'Generated equation: u=1', parts: [textPart('Generated equation: '), mathPart('u=1')] },
    ]);
  });

  it('declares prose summaries and merges typed rows without reparsing text', () => {
    const prose = proseSolveSummary('Validated one exact branch.');
    const mixed = solveSummaryFromParts([
      [textPart('Generated equation: '), mathPart('x=1')],
    ]);

    expect(prose).toEqual({
      solveSummaryParts: [[textPart('Validated one exact branch.')]],
    });
    expect(mergeSolveSummaries(prose, undefined, mixed)).toEqual({
      solveSummaryParts: [
        [textPart('Validated one exact branch.')],
        [textPart('Generated equation: '), mathPart('x=1')],
      ],
    });
  });

  it('resolves typed parts and explicit kinds without text inference', () => {
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
    })).toEqual({ source: 'undeclared', kind: 'text' });
  });
});
