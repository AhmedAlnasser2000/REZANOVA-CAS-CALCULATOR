import { describe, expect, it } from 'vitest';
import { mathFieldPlaceholder, mathFieldTextPlaceholder } from './math-field-placeholder';

describe('math-field placeholders', () => {
  it('shows readable words as a LaTeX text run with TeX specials escaped', () => {
    expect(mathFieldTextPlaceholder('Enter an expression…')).toBe(String.raw`\text{Enter an expression…}`);
    expect(mathFieldTextPlaceholder('Type dataset(...) or 50% of {a}')).toBe(String.raw`\text{Type dataset(...) or 50\% of \{a\}}`);
    expect(mathFieldTextPlaceholder(String.raw`a\b_c^d~e$f&g#h`)).toBe(
      String.raw`\text{a\textbackslash{}b\_c\textasciicircum{}d\textasciitilde{}e\$f\&g\#h}`,
    );
    expect(mathFieldTextPlaceholder('')).toBe('');
  });

  it('passes math through unchanged and prefers it over text', () => {
    expect(mathFieldPlaceholder({ latex: 'x^2' })).toEqual({ latex: 'x^2', readable: 'x^2' });
    expect(mathFieldPlaceholder({ text: 'Enter math' })).toEqual({ latex: String.raw`\text{Enter math}`, readable: 'Enter math' });
    expect(mathFieldPlaceholder({ text: 'ignored', latex: 'x' }).latex).toBe('x');
    expect(mathFieldPlaceholder({})).toEqual({ latex: '', readable: '' });
  });
});
