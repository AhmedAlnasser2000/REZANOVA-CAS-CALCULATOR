import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import type { MathJson } from '../parameterized/math-json';
import {
  buildPrincipalRootImageFact,
  classifyPrincipalRootImageValue,
  principalRootImageConditionLatex,
  principalRootImageSupplementLatex,
} from './complex-principal-image';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json as MathJson;
}

describe('Complex principal-root image substrate', () => {
  it('renders reusable principal-image facts for square roots and higher roots', () => {
    expect(principalRootImageConditionLatex('a', 2)).toBe(
      String.raw`\operatorname{Re}\left(a\right)>0\ \lor\ \left(\operatorname{Re}\left(a\right)=0\ \land\ \operatorname{Im}\left(a\right)\ge0\right)`,
    );
    expect(principalRootImageConditionLatex('a', 5)).toBe(
      String.raw`a=0\ \lor\ -\frac{\pi}{5}<\arg\left(a\right)\le\frac{\pi}{5}`,
    );
  });

  it('classifies exact real constants on the principal-root image boundary', () => {
    expect(classifyPrincipalRootImageValue(parse('0'), 2)).toBe('inside');
    expect(classifyPrincipalRootImageValue(parse('2'), 2)).toBe('inside');
    expect(classifyPrincipalRootImageValue(parse('-2'), 2)).toBe('outside');
    expect(classifyPrincipalRootImageValue(parse('2'), 7)).toBe('inside');
    expect(classifyPrincipalRootImageValue(parse('-2'), 7)).toBe('outside');
  });

  it('classifies simple exact imaginary-axis constants without broad complex arithmetic', () => {
    expect(classifyPrincipalRootImageValue(parse(String.raw`\imaginaryI`), 2)).toBe('inside');
    expect(classifyPrincipalRootImageValue(parse(String.raw`-\imaginaryI`), 2)).toBe('outside');
    expect(classifyPrincipalRootImageValue(parse(String.raw`\imaginaryI`), 3)).toBe('outside');
    expect(classifyPrincipalRootImageValue(parse(String.raw`-\imaginaryI`), 3)).toBe('outside');
  });

  it('keeps unclassified symbolic values as guarded supplement facts', () => {
    const square = buildPrincipalRootImageFact(parse('a'), 2);
    const fifth = buildPrincipalRootImageFact(parse('a'), 5);

    expect(square.classification).toBe('unknown');
    expect(square.detailLines.join(' ')).toContain('Principal 2-root image');
    expect(square.detailLines.join(' ')).toContain('guarded fact');
    expect(principalRootImageSupplementLatex(parse('a'), 2)).toBe(square.conditionLatex);
    expect(fifth.classification).toBe('unknown');
    expect(principalRootImageSupplementLatex(parse('2'), 5)).toBeNull();
    expect(principalRootImageSupplementLatex(parse('-2'), 5)).toBeNull();
  });
});
