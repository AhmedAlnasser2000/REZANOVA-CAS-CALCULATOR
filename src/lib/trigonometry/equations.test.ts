import { describe, expect, it } from 'vitest';
import { solveTrigEquation } from './equations';

describe('trigonometry equations', () => {
  it('returns exact special-angle solutions for sin(x)=1/2', () => {
    const result = solveTrigEquation({
      equationLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
      variable: 'x',
      angleUnit: 'deg',
    });
    expect(result.exactLatex).toBe('x\\in\\left\\{30^{\\circ}, 150^{\\circ}\\right\\}');
    expect(result.warnings[1]).toContain('Periodic families');
  });

  it('supports simple transformed arguments such as sin(2x)=0', () => {
    const result = solveTrigEquation({
      equationLatex: '\\sin\\left(2x\\right)=0',
      variable: 'x',
      angleUnit: 'deg',
    });
    expect(result.exactLatex).toBe('x\\in\\left\\{0^{\\circ}, 90^{\\circ}\\right\\}');
  });

  it('formats radian solutions for tan(x)=1', () => {
    const result = solveTrigEquation({
      equationLatex: '\\tan\\left(x\\right)=1',
      variable: 'x',
      angleUnit: 'rad',
    });
    expect(result.exactLatex).toBe('x=\\frac{\\pi}{4}');
  });
});
