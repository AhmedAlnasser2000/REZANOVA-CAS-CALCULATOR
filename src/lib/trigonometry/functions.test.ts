import { describe, expect, it } from 'vitest';
import { evaluateTrigFunction } from './functions';

describe('trigonometry functions', () => {
  it('returns exact special-angle values in degree mode', () => {
    const result = evaluateTrigFunction('\\sin\\left(30\\right)', 'deg');
    expect(result.exactLatex).toBe('\\frac{1}{2}');
    expect(result.resultOrigin).toBe('exact-special-angle');
  });

  it('returns exact special-angle values in radian mode', () => {
    const result = evaluateTrigFunction('\\cos\\left(\\frac{\\pi}{3}\\right)', 'rad');
    expect(result.exactLatex).toBe('\\frac{1}{2}');
  });

  it('treats plain numeric direct trig input as a numeric angle in the selected unit', () => {
    const degreeResult = evaluateTrigFunction('\\sin\\left(90\\right)', 'deg');
    const radianResult = evaluateTrigFunction('\\sin\\left(90\\right)', 'rad');
    const gradianResult = evaluateTrigFunction('\\sin\\left(90\\right)', 'grad');

    expect(degreeResult.exactLatex).toBe('1');

    expect(Number(radianResult.approxText)).toBeCloseTo(0.8939966636, 6);
    expect(radianResult.resultOrigin).toBe('numeric');

    expect(Number(gradianResult.approxText)).toBeCloseTo(0.9876883406, 6);
    expect(gradianResult.resultOrigin).toBe('numeric');
  });

  it('treats pi-based direct trig input as a numeric angle in the selected unit', () => {
    const degreeResult = evaluateTrigFunction('\\sin\\left(\\frac{\\pi}{2}\\right)', 'deg');
    const gradianResult = evaluateTrigFunction('\\sin\\left(\\frac{\\pi}{2}\\right)', 'grad');

    expect(Number(degreeResult.approxText)).toBeCloseTo(0.02741213359, 6);
    expect(degreeResult.resultOrigin).toBe('numeric');

    expect(Number(gradianResult.approxText)).toBeCloseTo(0.02467150746, 6);
    expect(gradianResult.resultOrigin).toBe('numeric');
  });

  it('returns exact inverse-trig principal values when supported', () => {
    const result = evaluateTrigFunction('\\arcsin\\left(\\frac{1}{2}\\right)', 'deg');
    expect(result.exactLatex).toBe('30^{\\circ}');
  });

  it('falls back to numeric evaluation for non-special angles', () => {
    const result = evaluateTrigFunction('\\tan\\left(50\\right)', 'deg');
    expect(Number(result.approxText)).toBeCloseTo(Math.tan((50 * Math.PI) / 180), 6);
    expect(result.resultOrigin).toBe('numeric');
  });
});
