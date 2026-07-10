import { describe, expect, it } from 'vitest';
import { runExpressionAction } from '../math-engine';
import { request } from './test-support';

describe('runExpressionAction numeric evaluation', () => {
  it('evaluates nCr and nPr exactly through the discrete fallback', () => {
    const combination = runExpressionAction(
      { ...request, document: { latex: '\\operatorname{nCr}(5,2)' } },
      'evaluate',
    );
    const permutation = runExpressionAction(
      { ...request, document: { latex: '\\operatorname{nPr}(5,2)' } },
      'evaluate',
    );

    expect(combination.error).toBeUndefined();
    expect(combination.exactLatex).toBe('10');
    expect(permutation.error).toBeUndefined();
    expect(permutation.exactLatex).toBe('20');
  });

  it('returns controlled errors for invalid discrete domains', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\operatorname{nCr}(5,-1)' } },
      'evaluate',
    );

    expect(result.error).toContain('non-negative integers');
  });

  it('returns a controlled error for explicit negative factorial input', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '(-1)!' } },
      'evaluate',
    );

    expect(result.error).toContain('Factorial is defined only for non-negative integers');
  });

  it('guards factorial output that exceeds the supported display range', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '4455!' } },
      'evaluate',
    );

    expect(result.error).toContain('too large to display safely');
  });

  it('guards evaluated values that are too small to display safely', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '10^{-200}' } },
      'evaluate',
    );

    expect(result.error).toContain('too small to display safely');
  });

  it('guards evaluated values that are too large to display safely', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '10^{200}' } },
      'evaluate',
    );

    expect(result.error).toContain('too large to display safely');
  });

  it('respects degree mode for direct numeric trig in Calculate', () => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\sin\\left(90\\right)' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('1');
  });

  it('applies the selected angle unit to plain numeric direct trig input', () => {
    const degreeResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\sin\\left(90\\right)' } },
      'evaluate',
    );
    const radianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'rad', document: { latex: '\\sin\\left(90\\right)' } },
      'evaluate',
    );
    const gradianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'grad', document: { latex: '\\sin\\left(90\\right)' } },
      'evaluate',
    );

    expect(degreeResult.error).toBeUndefined();
    expect(degreeResult.exactLatex).toBe('1');

    expect(radianResult.error).toBeUndefined();
    expect(Number(radianResult.approxText)).toBeCloseTo(0.8939966636, 6);

    expect(gradianResult.error).toBeUndefined();
    expect(Number(gradianResult.approxText)).toBeCloseTo(0.9876883406, 6);
  });

  it('canonicalizes typed trig tokens before Calculate evaluation', () => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: 'sin(90)' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('1');
  });

  it('applies the selected angle unit to direct trig even when the numeric argument uses pi', () => {
    const degreeResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\sin\\left(\\frac{\\pi}{2}\\right)' } },
      'evaluate',
    );
    const radianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'rad', document: { latex: '\\sin\\left(\\frac{\\pi}{2}\\right)' } },
      'evaluate',
    );
    const gradianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'grad', document: { latex: '\\sin\\left(\\frac{\\pi}{2}\\right)' } },
      'evaluate',
    );

    expect(degreeResult.error).toBeUndefined();
    expect(Number(degreeResult.approxText)).toBeCloseTo(0.02741213359, 6);

    expect(radianResult.error).toBeUndefined();
    expect(radianResult.exactLatex).toBe('1');

    expect(gradianResult.error).toBeUndefined();
    expect(Number(gradianResult.approxText)).toBeCloseTo(0.02467150746, 6);
  });

  it('applies the selected angle unit to inverse trig evaluation in Calculate', () => {
    const degreeResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\arctan\\left(1\\right)' } },
      'evaluate',
    );
    const radianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'rad', document: { latex: '\\arctan\\left(1\\right)' } },
      'evaluate',
    );
    const gradianResult = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'grad', document: { latex: '\\arctan\\left(1\\right)' } },
      'evaluate',
    );

    expect(degreeResult.error).toBeUndefined();
    expect(Number(degreeResult.approxText)).toBeCloseTo(45, 6);

    expect(radianResult.error).toBeUndefined();
    expect(Number(radianResult.approxText)).toBeCloseTo(Math.PI / 4, 6);

    expect(gradianResult.error).toBeUndefined();
    expect(Number(gradianResult.approxText)).toBeCloseTo(50, 6);
  });

  it.each([
    ['\\arcsin\\left(1\\right)', 'deg', '90'],
    ['\\arcsin\\left(1\\right)', 'rad', '\\frac{\\pi}{2}'],
    ['\\arcsin\\left(1\\right)', 'grad', '100'],
    ['\\arccos\\left(-1\\right)', 'deg', '180'],
    ['\\arccos\\left(-1\\right)', 'rad', '\\pi'],
    ['\\arccos\\left(-1\\right)', 'grad', '200'],
    ['\\arctan\\left(1\\right)', 'deg', '45'],
    ['\\arctan\\left(1\\right)', 'rad', '\\frac{\\pi}{4}'],
    ['\\arctan\\left(1\\right)', 'grad', '50'],
  ] as const)('keeps exact inverse-trig special values in %s mode for %s', (latex, angleUnit, exactLatex) => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit, document: { latex } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe(exactLatex);
    expect(result.resultOrigin).toBe('exact-special-angle');
  });

  it.each(['deg', 'rad', 'grad'] as const)('stops inverse-trig real-domain violations in %s mode', (angleUnit) => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit, document: { latex: '\\arcsin\\left(2\\right)' } },
      'evaluate',
    );

    expect(result.exactLatex).toBeUndefined();
    expect(result.error).toContain('between -1 and 1');
  });

  it('respects gradian mode for direct numeric trig in Calculate', () => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'grad', document: { latex: '\\sin\\left(100\\right)' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('1');
  });

  it('keeps symbolic trig symbolic in Calculate', () => {
    const result = runExpressionAction(
      { ...request, mode: 'calculate', angleUnit: 'deg', document: { latex: '\\sin\\left(x\\right)' } },
      'evaluate',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('\\sin');
    expect(result.exactLatex).toContain('x');
  });

  it('uses the real-domain numeric evaluator for broadened power, root, and log cases', () => {
    const power = runExpressionAction(
      { ...request, document: { latex: '2^{\\pi}' } },
      'evaluate',
    );
    const oddRoot = runExpressionAction(
      { ...request, document: { latex: '\\sqrt[3]{-8}' } },
      'evaluate',
    );
    const explicitBaseLog = runExpressionAction(
      { ...request, document: { latex: '\\log_{4}\\left(16\\right)' } },
      'evaluate',
    );

    expect(power.error).toBeUndefined();
    expect(power.resultOrigin).toBe('numeric-fallback');
    expect(Number(power.approxText)).toBeCloseTo(8.8249778, 5);

    expect(oddRoot.error).toBeUndefined();
    expect(oddRoot.resultOrigin).toBe('numeric-fallback');
    expect(oddRoot.exactLatex).toBe('-2');

    expect(explicitBaseLog.error).toBeUndefined();
    expect(explicitBaseLog.resultOrigin).toBe('numeric-fallback');
    expect(explicitBaseLog.exactLatex).toBe('2');
  });

  it('accepts exact odd-denominator rational exponents on negative bases', () => {
    const cubeRootPower = runExpressionAction(
      { ...request, document: { latex: '\\left(-8\\right)^{\\frac{1}{3}}' } },
      'evaluate',
    );
    const twoThirdsPower = runExpressionAction(
      { ...request, document: { latex: '\\left(-8\\right)^{\\frac{2}{3}}' } },
      'evaluate',
    );

    expect(cubeRootPower.error).toBeUndefined();
    expect(cubeRootPower.exactLatex).toBe('-2');
    expect(twoThirdsPower.error).toBeUndefined();
    expect(twoThirdsPower.exactLatex).toBe('4');
  });

  it('rejects real-domain-invalid numeric power, root, and log cases with controlled errors', () => {
    const decimalPower = runExpressionAction(
      { ...request, document: { latex: '\\left(-8\\right)^{0.3333333333333333}' } },
      'evaluate',
    );
    const sqrtNegative = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{-4}' } },
      'evaluate',
    );
    const zeroToZero = runExpressionAction(
      { ...request, document: { latex: '0^0' } },
      'evaluate',
    );
    const zeroToNegative = runExpressionAction(
      { ...request, document: { latex: '0^{-1}' } },
      'evaluate',
    );
    const invalidLogBase = runExpressionAction(
      { ...request, document: { latex: '\\log_{1}\\left(16\\right)' } },
      'evaluate',
    );

    expect(decimalPower.error).toContain('odd denominators');
    expect(sqrtNegative.error).toContain('Square roots require non-negative radicands');
    expect(zeroToZero.error).toContain('0^0');
    expect(zeroToNegative.error).toContain('negative exponent');
    expect(invalidLogBase.error).toContain('positive base that is not 1');
  });

  it('does not leak raw NaN through simplify for invalid numeric log/root expressions', () => {
    const logNegative = runExpressionAction(
      { ...request, document: { latex: '\\log\\left(-8\\right)' } },
      'simplify',
    );
    const sqrtNegative = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{-4}' } },
      'simplify',
    );

    expect(logNegative.error).toContain('Logarithms require positive arguments');
    expect(logNegative.approxText).toBeUndefined();
    expect(sqrtNegative.error).toContain('Square roots require non-negative radicands');
    expect(sqrtNegative.approxText).toBeUndefined();
  });
});
