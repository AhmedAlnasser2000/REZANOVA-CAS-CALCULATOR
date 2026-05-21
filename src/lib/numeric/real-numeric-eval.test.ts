import { describe, expect, it } from 'vitest';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  containsRealNumericFamily,
  evaluateRealNumericExpression,
} from './real-numeric-eval';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

describe('real numeric evaluator', () => {
  it('evaluates broad positive-base powers', () => {
    const powerPi = evaluateRealNumericExpression(parse('2^{\\pi}'), '2^{\\pi}');
    const rationalPower = evaluateRealNumericExpression(parse('\\left(9\\right)^{\\frac{3}{2}}'), '\\left(9\\right)^{\\frac{3}{2}}');

    expect(powerPi.kind).toBe('success');
    expect(rationalPower.kind).toBe('success');
    if (powerPi.kind !== 'success' || rationalPower.kind !== 'success') {
      throw new Error('Expected success');
    }

    expect(powerPi.value).toBeCloseTo(8.8249778, 5);
    expect(rationalPower.value).toBe(27);
  });

  it('supports negative bases only for integers and exact odd-denominator rationals', () => {
    const integerExponent = evaluateRealNumericExpression(parse('\\left(-8\\right)^3'), '\\left(-8\\right)^3');
    const oddRoot = evaluateRealNumericExpression(parse('\\left(-8\\right)^{\\frac{1}{3}}'), '\\left(-8\\right)^{\\frac{1}{3}}');
    const oddRational = evaluateRealNumericExpression(parse('\\left(-8\\right)^{\\frac{2}{3}}'), '\\left(-8\\right)^{\\frac{2}{3}}');
    const decimalLooksLikeThird = evaluateRealNumericExpression(parse('\\left(-8\\right)^{0.3333333333333333}'), '\\left(-8\\right)^{0.3333333333333333}');

    expect(integerExponent.kind).toBe('success');
    expect(oddRoot.kind).toBe('success');
    expect(oddRational.kind).toBe('success');
    if (
      integerExponent.kind !== 'success'
      || oddRoot.kind !== 'success'
      || oddRational.kind !== 'success'
    ) {
      throw new Error('Expected success');
    }
    expect(integerExponent.value).toBe(-512);
    expect(oddRoot.value).toBe(-2);
    expect(oddRational.value).toBe(4);

    expect(decimalLooksLikeThird.kind).toBe('domain-error');
    if (decimalLooksLikeThird.kind !== 'domain-error') {
      throw new Error('Expected a domain error');
    }
    expect(decimalLooksLikeThird.error).toContain('odd denominators');
  });

  it('rejects zero singularities in power expressions', () => {
    const zeroToZero = evaluateRealNumericExpression(parse('0^0'), '0^0');
    const zeroToNegative = evaluateRealNumericExpression(parse('0^{-1}'), '0^{-1}');

    expect(zeroToZero.kind).toBe('domain-error');
    expect(zeroToNegative.kind).toBe('domain-error');
    if (zeroToZero.kind !== 'domain-error' || zeroToNegative.kind !== 'domain-error') {
      throw new Error('Expected domain errors');
    }
    expect(zeroToZero.error).toContain('0^0');
    expect(zeroToNegative.error).toContain('negative exponent');
  });

  it('evaluates and guards roots in the real domain', () => {
    const sqrtNine = evaluateRealNumericExpression(parse('\\sqrt{9}'), '\\sqrt{9}');
    const sqrtNegative = evaluateRealNumericExpression(parse('\\sqrt{-4}'), '\\sqrt{-4}');
    const cubeRootNegative = evaluateRealNumericExpression(parse('\\sqrt[3]{-8}'), '\\sqrt[3]{-8}');
    const fourthRoot = evaluateRealNumericExpression(parse('\\sqrt[4]{16}'), '\\sqrt[4]{16}');
    const invalidIndex = evaluateRealNumericExpression(parse('\\sqrt[0]{16}'), '\\sqrt[0]{16}');

    expect(sqrtNine.kind).toBe('success');
    expect(cubeRootNegative.kind).toBe('success');
    expect(fourthRoot.kind).toBe('success');
    if (
      sqrtNine.kind !== 'success'
      || cubeRootNegative.kind !== 'success'
      || fourthRoot.kind !== 'success'
    ) {
      throw new Error('Expected success');
    }
    expect(sqrtNine.value).toBe(3);
    expect(cubeRootNegative.value).toBe(-2);
    expect(fourthRoot.value).toBe(2);

    expect(sqrtNegative.kind).toBe('domain-error');
    expect(invalidIndex.kind).toBe('domain-error');
  });

  it('evaluates logs with base checks', () => {
    const naturalLog = evaluateRealNumericExpression(parse('\\ln\\left(\\frac{7}{3}\\right)'), '\\ln\\left(\\frac{7}{3}\\right)');
    const commonLog = evaluateRealNumericExpression(parse('\\log\\left(1000\\right)'), '\\log\\left(1000\\right)');
    const explicitBase = evaluateRealNumericExpression(parse('\\log_{4}\\left(16\\right)'), '\\log_{4}\\left(16\\right)');
    const invalidBase = evaluateRealNumericExpression(parse('\\log_{1}\\left(16\\right)'), '\\log_{1}\\left(16\\right)');
    const invalidArgument = evaluateRealNumericExpression(parse('\\ln\\left(-1\\right)'), '\\ln\\left(-1\\right)');

    expect(naturalLog.kind).toBe('success');
    expect(commonLog.kind).toBe('success');
    expect(explicitBase.kind).toBe('success');
    if (
      naturalLog.kind !== 'success'
      || commonLog.kind !== 'success'
      || explicitBase.kind !== 'success'
    ) {
      throw new Error('Expected success');
    }
    expect(naturalLog.value).toBeCloseTo(Math.log(7 / 3), 6);
    expect(commonLog.value).toBeCloseTo(3, 12);
    expect(explicitBase.value).toBeCloseTo(2, 12);

    expect(invalidBase.kind).toBe('domain-error');
    expect(invalidArgument.kind).toBe('domain-error');
  });

  it('handles mixed arithmetic compositions over the supported families', () => {
    const result = evaluateRealNumericExpression(
      parse('\\left(\\frac{1}{2}+\\ln\\left(e\\right)\\right)\\sqrt[3]{-8}+\\log_{10}\\left(100\\right)'),
      '\\left(\\frac{1}{2}+\\ln\\left(e\\right)\\right)\\sqrt[3]{-8}+\\log_{10}\\left(100\\right)',
    );

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.value).toBeCloseTo(-1, 6);
  });

  it('detects target power/root/log families without treating plain arithmetic as PRL2 work', () => {
    expect(containsRealNumericFamily(parse('\\sqrt[3]{-8}'))).toBe(true);
    expect(containsRealNumericFamily(parse('\\log_{4}\\left(16\\right)'))).toBe(true);
    expect(containsRealNumericFamily(parse('1+2'))).toBe(false);
  });
});
