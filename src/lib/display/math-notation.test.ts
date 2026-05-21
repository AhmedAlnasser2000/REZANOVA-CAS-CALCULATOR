import { describe, expect, it } from 'vitest';
import { formatMathTextForDisplay, latexToPlainText, latexToVisibleText } from './math-notation';

describe('math notation formatting', () => {
  it('formats common latex commands into readable unicode plain text', () => {
    expect(latexToPlainText('\\tan\\left(\\ln\\left(x+1\\right)\\right)=2\\pi k')).toBe(
      'tan(ln(x+1)) = 2π k',
    );
  });

  it('converts summary-style text without leaking raw latex commands', () => {
    expect(
      formatMathTextForDisplay('\\tan(\\ln(x+1)) ~= -6.283185 and k \\in \\mathbb{Z}', 'rendered'),
    ).toBe('tan(ln(x+1)) ≈ -6.283185 and k ∈ ℤ');
  });

  it('keeps canonical latex when latex mode is selected', () => {
    expect(latexToVisibleText('x^{\\frac{1}{6}}', 'latex')).toBe('x^{\\frac{1}{6}}');
  });

  it('uses the visible display normalization for plain-text copy surfaces', () => {
    expect(
      latexToVisibleText('x^{\\frac{1}{6}}', 'plainText', {
        symbolicDisplayMode: 'roots',
        flattenNestedRootsWhenSafe: true,
      }),
    ).toBe('root(6, x)');
  });
});
