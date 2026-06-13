import { describe, expect, it } from 'vitest';
import { containsEquationImaginaryUnitLatex } from './complex-input-policy';

describe('complex input policy', () => {
  it('detects the Equation imaginary unit only at standalone i or explicit command boundaries', () => {
    expect(containsEquationImaginaryUnitLatex('x+i=0')).toBe(true);
    expect(containsEquationImaginaryUnitLatex(String.raw`x+\imaginaryI=0`)).toBe(true);
    expect(containsEquationImaginaryUnitLatex('2i+x=0')).toBe(true);
    expect(containsEquationImaginaryUnitLatex('-i+x=0')).toBe(true);
    expect(containsEquationImaginaryUnitLatex(String.raw`x+\imaginaryIx=0`)).toBe(false);
    expect(containsEquationImaginaryUnitLatex('xi+index+iota=0')).toBe(false);
    expect(containsEquationImaginaryUnitLatex('x+j+k=0')).toBe(false);
    expect(containsEquationImaginaryUnitLatex(null)).toBe(false);
  });
});
