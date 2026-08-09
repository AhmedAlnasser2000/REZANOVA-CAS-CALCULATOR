import { describe, expect, it } from 'vitest';
import { renderCalculusStandardMathJson } from './antiderivative-standard-math';

describe('calculus standard MathJSON readback', () => {
  it('renders migrated Integration notation from producer-owned MathJSON', () => {
    expect(renderCalculusStandardMathJson(
      ['Power', 'ExponentialE', ['Add', ['Multiply', 2, 'x'], 1]],
      { variable: 'x' },
    )).toBe(String.raw`e^{2x+1}`);

    expect(renderCalculusStandardMathJson(
      ['Add', 4, ['Power', 'x', 2], ['Multiply', 3, 'x']],
      { variable: 'x' },
    )).toBe(String.raw`x^{2}+3x+4`);

    expect(renderCalculusStandardMathJson(
      ['Multiply', 2, ['Ln', ['Multiply', 'alpha_1', 'x']]],
      { variable: 'x' },
    )).toBe(String.raw`2\cdot\ln(\alpha_{1}x)`);

    expect(renderCalculusStandardMathJson(['Erf', 'x'], { variable: 'x' }))
      .toBe(String.raw`\operatorname{erf}\left(x\right)`);
    expect(renderCalculusStandardMathJson(['Erfi', 'x'], { variable: 'x' }))
      .toBe(String.raw`\operatorname{erfi}\left(x\right)`);
  });

  it('normalizes signs and coefficient products structurally', () => {
    expect(renderCalculusStandardMathJson(
      ['Multiply', ['Rational', -1, 2], ['Add', ['Power', 'x', 2], 1]],
      { variable: 'x' },
    )).toBe(String.raw`-\frac{\left(x^{2}+1\right)}{2}`);

    expect(renderCalculusStandardMathJson(
      ['Divide', ['Multiply', 3, 'x'], ['Multiply', 2, 'a']],
      { variable: 'x' },
    )).toBe(String.raw`\frac{3x}{2a}`);
  });
});
