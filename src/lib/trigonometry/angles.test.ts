import { describe, expect, it } from 'vitest';
import { convertAngle, convertAngleState, evaluateSpecialTrig, parseAngleInput } from './angles';

describe('trigonometry angles', () => {
  it('converts between degree and radian values', () => {
    expect(convertAngle(180, 'deg', 'rad')).toBeCloseTo(Math.PI, 10);
    expect(convertAngle(Math.PI / 2, 'rad', 'deg')).toBeCloseTo(90, 10);
  });

  it('parses supported radian special-angle forms', () => {
    expect(parseAngleInput('\\frac{\\pi}{6}', 'rad')).toBeCloseTo(30, 10);
    expect(parseAngleInput('\\pi', 'rad')).toBeCloseTo(180, 10);
  });

  it('returns exact special-angle trig values around the unit circle', () => {
    expect(evaluateSpecialTrig('sin', 150)).toBe('\\frac{1}{2}');
    expect(evaluateSpecialTrig('cos', 150)).toBe('-\\frac{\\sqrt{3}}{2}');
    expect(evaluateSpecialTrig('tan', 90)).toBe('\\text{undefined}');
  });

  it('keeps exact radian output for special-angle conversion', () => {
    const result = convertAngleState({ value: '30', from: 'deg', to: 'rad' });
    expect(result.exactLatex).toBe('\\frac{\\pi}{6}');
    expect(result.resultOrigin).toBe('exact-special-angle');
  });
});
