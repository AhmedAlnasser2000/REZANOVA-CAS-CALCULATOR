import { describe, expect, it } from 'vitest';
import { runExpressionAction } from '../math-engine';
import { request } from './test-support';

describe('runExpressionAction factorization', () => {
  it('falls back to symbolic common-factor extraction', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'ab+ac' } },
      'factor',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('a');
    expect(result.exactLatex).toContain('b+c');
  });

  it('factors common symbolic terms such as ax+ay', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'ax+ay' } },
      'factor',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('a');
    expect(result.exactLatex).toContain('x+y');
  });

  it('factors symbolic difference of squares', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'x^2-y^2' } },
      'factor',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('x-y');
    expect(result.exactLatex).toContain('x+y');
  });

  it('factors symbolic like terms before numeric coefficients', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '56u+27xu+27' } },
      'factor',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic-engine');
    const normalized = result.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '') ?? '';
    expect(normalized).toContain('u(');
    expect(normalized).toContain('27x');
    expect(normalized).toContain('56');
    expect(result.exactLatex).toContain('u');
  });

  it('factors simple perfect-square trinomials', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'x^2+2x+1' } },
      'factor',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('x+1');
    expect(result.exactLatex).toContain('x+1');
  });

  it('factors supported cubic polynomials through the bounded exact engine', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'x^3-6x^2+11x-6' } },
      'factor',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic-engine');
    expect(result.exactLatex).toBe('(x^2-5x+6)(x-1)');
  });

  it('factors supported biquadratics into exact algebraic quadratic factors', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'x^4-5x^2+3' } },
      'factor',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic-engine');
    expect(result.exactLatex).toContain('x^2');
    expect(result.exactLatex).toContain('\\sqrt{13}');
  });

  it('factors bounded mixed polynomial-radical families in Factor mode while preserving domain conditions', () => {
    const squareRootCarrier = runExpressionAction(
      { ...request, document: { latex: 'x-5\\sqrt{x}+6' } },
      'factor',
    );
    const rationalPowerCarrier = runExpressionAction(
      { ...request, document: { latex: 'x^{2/3}-5x^{1/3}+6' } },
      'factor',
    );

    expect(squareRootCarrier.error).toBeUndefined();
    expect(squareRootCarrier.resultOrigin).toBe('symbolic-engine');
    expect(squareRootCarrier.exactLatex).toContain('\\sqrt{x}-2');
    expect(squareRootCarrier.exactLatex).toContain('\\sqrt{x}-3');
    expect(squareRootCarrier.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);

    expect(rationalPowerCarrier.error).toBeUndefined();
    expect(rationalPowerCarrier.resultOrigin).toBe('symbolic-engine');
    expect(rationalPowerCarrier.exactLatex).toContain('\\sqrt[3]{x}-2');
    expect(rationalPowerCarrier.exactLatex).toContain('\\sqrt[3]{x}-3');
  });

  it('keeps unsupported mixed radical families unchanged in Factor mode', () => {
    const unrelated = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x}+\\sqrt{x+1}' } },
      'factor',
    );

    expect(unrelated.error).toBeUndefined();
    expect(unrelated.exactLatex).toBe('\\sqrt{x}+\\sqrt{x+1}');
  });
});
