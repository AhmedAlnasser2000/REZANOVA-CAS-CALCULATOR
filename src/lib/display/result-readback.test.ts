import { describe, expect, it } from 'vitest';
import {
  buildResultReadbackSections,
  cleanDisplaySupplementLatex,
} from './result-readback';

describe('result readback display sections', () => {
  it('labels exact output as the answer', () => {
    expect(buildResultReadbackSections({ exactLatex: 'x=2' })).toEqual([
      {
        kind: 'answer',
        label: 'Answer',
        latex: 'x=2',
      },
    ]);
  });

  it('labels plain and prefixed supplements as valid-when conditions', () => {
    expect(buildResultReadbackSections({
      exactSupplementLatex: [
        'a>0',
        '\\text{Conditions: } x\\ge0',
        '\\text{Exclusions: } x\\ne0',
      ],
    })).toEqual([
      {
        kind: 'valid-when',
        label: 'Valid when',
        latex: ['a>0', 'x\\ge0', 'x\\ne0'],
      },
    ]);
  });

  it('cleans display prefixes without mutating the original latex', () => {
    const supplements = ['\\text{Conditions: } x>0'];
    const sections = buildResultReadbackSections({ exactSupplementLatex: supplements });

    expect(cleanDisplaySupplementLatex(supplements[0])).toBe('x>0');
    expect(sections[0]).toEqual({
      kind: 'valid-when',
      label: 'Valid when',
      latex: ['x>0'],
    });
    expect(supplements).toEqual(['\\text{Conditions: } x>0']);
  });
});
