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

  it('supports affine phase-shifted arguments in bounded solve', () => {
    const result = solveTrigEquation({
      equationLatex: '\\sin\\left(x+30\\right)=\\frac{1}{2}',
      variable: 'x',
      angleUnit: 'deg',
    });
    expect(result.exactLatex).toBe('x\\in\\left\\{0^{\\circ}, 120^{\\circ}\\right\\}');
  });

  it('supports affine wrappers such as 3sin(x+45)-1=0', () => {
    const result = solveTrigEquation({
      equationLatex: '3\\sin\\left(x+45\\right)-1=0',
      variable: 'x',
      angleUnit: 'deg',
    });
    expect(result.exactLatex ?? '').toContain('x\\in');
    expect(result.warnings.join(' ')).toContain('Angle unit');
  });

  it('supports mixed same-argument linear trig forms', () => {
    const result = solveTrigEquation({
      equationLatex: '2\\sin\\left(x\\right)+2\\cos\\left(x\\right)=2',
      variable: 'x',
      angleUnit: 'deg',
    });
    expect(result.exactLatex ?? '').toContain('x\\in');
    expect(result.warnings.join(' ')).toContain('Reduced 2sin');
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
