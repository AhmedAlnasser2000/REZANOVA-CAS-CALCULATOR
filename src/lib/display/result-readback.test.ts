import { describe, expect, it } from 'vitest';
import {
  buildResultReadbackSections,
  cleanDisplaySupplementLatex,
  spaceImplicitProductsForMathDisplay,
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

  it('adds display-safe product spacing to generated answer and condition latex', () => {
    const condition = '\\frac{uy\\sqrt{k}}{va^3}-\\frac{b^2}{v(z^2-\\ln(m)+\\sqrt{x})a^3}\\ge0';

    expect(spaceImplicitProductsForMathDisplay(condition)).toBe(
      '\\frac{u\\,y\\sqrt{k}}{v\\,a^3}-\\frac{b^2}{v\\,(z^2-\\ln(m)+\\sqrt{x})\\,a^3}\\ge0',
    );

    expect(buildResultReadbackSections({
      exactLatex: 'a=\\sqrt[3]{\\frac{uy\\sqrt{k}}{vc^4}-\\frac{b^2}{v(z^2-\\ln(m)+\\sqrt{x})c^4}}',
      exactSupplementLatex: [condition],
    })).toEqual([
      {
        kind: 'answer',
        label: 'Answer',
        latex: 'a=\\sqrt[3]{\\frac{uy\\sqrt{k}}{vc^4}-\\frac{b^2}{v(z^2-\\ln(m)+\\sqrt{x})c^4}}',
      },
      {
        kind: 'valid-when',
        label: 'Valid when',
        latex: [
          '\\frac{u\\,y\\sqrt{k}}{v\\,a^3}-\\frac{b^2}{v\\,(z^2-\\ln(m)+\\sqrt{x})\\,a^3}\\ge0',
        ],
      },
    ]);
  });

  it('does not add product spacing between function commands and their grouped argument', () => {
    expect(spaceImplicitProductsForMathDisplay('\\ln(m)+\\sqrt{x}+\\sin(z)+v(z+a)')).toBe(
      '\\ln(m)+\\sqrt{x}+\\sin(z)+v\\,(z+a)',
    );
  });
});
