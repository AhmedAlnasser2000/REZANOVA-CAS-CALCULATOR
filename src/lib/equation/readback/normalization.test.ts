import { describe, expect, it } from 'vitest';

import type { VariableAnalysis } from '../../algebra/variable-core/types';
import { normalizeExactReadbackExpression } from './normalization';

function normalize(latex: string, options: Parameters<typeof normalizeExactReadbackExpression>[1] = {}) {
  return normalizeExactReadbackExpression(latex, options).latex;
}

const userVariableIAnalysis: VariableAnalysis = {
  symbols: [{
    name: 'i',
    identifierKind: 'single-symbol-variable',
    roles: ['symbolic-parameter'],
    occurrences: 2,
  }],
  reservedIdentifiers: [],
  implicitCharacterProducts: [],
  stops: [],
};

describe('Equation exact readback normalization', () => {
  it('removes additive and multiplicative identity noise safely', () => {
    expect(normalize(String.raw`0+\sqrt{a}`)).toBe(String.raw`\sqrt{a}`);
    expect(normalize(String.raw`\sqrt{a}+0`)).toBe(String.raw`\sqrt{a}`);
    expect(normalize(String.raw`1\cdot a`)).toBe('a');
    expect(normalize(String.raw`a\cdot1`)).toBe('a');
  });

  it('collapses exact zero scalar products only for validated root expressions', () => {
    expect(normalize(String.raw`\frac{-1+1}{2}\sqrt{a}`))
      .toBe(String.raw`0\sqrt{a}`);
    expect(normalize(String.raw`\frac{-1+1}{2}\sqrt{a}`, {
      validatedRootExpression: true,
    })).toBe('0');
    expect(normalize(String.raw`0\cdot a`)).toBe(String.raw`0\cdot a`);
    expect(normalize('10', { validatedRootExpression: true })).toBe('10');
  });

  it('normalizes confirmed imaginary-unit products without touching user variable i', () => {
    expect(normalize(String.raw`\imaginaryI\imaginaryI`)).toBe('-1');
    expect(normalize('ii', {
      domainIntent: 'complex',
    })).toBe('-1');
    expect(normalize('i\\cdot i', {
      variableAnalysis: userVariableIAnalysis,
      domainIntent: 'complex',
    })).toBe('i\\cdot i');
  });

  it('keeps multivariable symbolic algebra out of the readback seam', () => {
    expect(normalize('b^2-4ac')).toBe('b^2-4ac');
    expect(normalize('F/a')).toBe('F/a');
    expect(normalize(String.raw`\sqrt{c^2(v+b)}`)).toBe(String.raw`\sqrt{c^2(v+b)}`);
  });

  it('cleans exact numeric fraction signs without rewriting symbolic fractions', () => {
    expect(normalize(String.raw`\frac{-1}{2}+\frac{-1}{2}\sqrt{5}`))
      .toBe(String.raw`-\frac{1}{2}-\frac{1}{2}\sqrt{5}`);
    expect(normalize(String.raw`\frac{1}{2}(-\sqrt{5})-\frac{1}{2}`))
      .toBe(String.raw`-\frac{1}{2}-\frac{1}{2}\sqrt{5}`);
    expect(normalize(String.raw`\frac{1}{2}(\sqrt{5})-\frac{1}{2}`))
      .toBe(String.raw`-\frac{1}{2}+\frac{1}{2}\sqrt{5}`);
    expect(normalize(String.raw`-\frac{1}{2}-\frac{1}{2}(\sqrt{5})i`))
      .toBe(String.raw`-\frac{1}{2}-\frac{1}{2}\sqrt{5}i`);
    expect(normalize(String.raw`\frac{1}{2}(-a-b)-\frac{1}{2}`))
      .toBe(String.raw`\frac{1}{2}(-a-b)-\frac{1}{2}`);
    expect(normalize(String.raw`-\frac{-1}{2}+\sqrt{5}`))
      .toBe(String.raw`\frac{1}{2}+\sqrt{5}`);
    expect(normalize(String.raw`-\frac{1}{2}+\left(-\frac{1}{2}\right)\sqrt{5}`))
      .toBe(String.raw`-\frac{1}{2}-\frac{1}{2}\sqrt{5}`);
    expect(normalize(String.raw`-\frac{1}{2}-\left(-\frac{1}{2}\right)\sqrt{5}`))
      .toBe(String.raw`-\frac{1}{2}+\frac{1}{2}\sqrt{5}`);
    expect(normalize(String.raw`1+-4\left(a\right)`))
      .toBe(String.raw`1-4\left(a\right)`);
    expect(normalize(String.raw`1+\left(-4a\right)`))
      .toBe('1-4a');
    expect(normalize(String.raw`+\frac{-a}{b}`))
      .toBe(String.raw`-\frac{a}{b}`);
    expect(normalize(String.raw`-\frac{b}{2a}+\frac{-\sqrt{b^2+-4ac}}{2a}`))
      .toBe(String.raw`-\frac{b}{2a}-\frac{\sqrt{b^2-4ac}}{2a}`);
    expect(normalize(String.raw`-\frac{b}{2a}+\frac{\left(-\sqrt{b^2+-4ac}\right)}{2a}`))
      .toBe(String.raw`-\frac{b}{2a}-\frac{\sqrt{b^2-4ac}}{2a}`);
    expect(normalize(String.raw`-\frac{b}{2a}+\frac{(-\sqrt{b^2+-4ac})}{2a}`))
      .toBe(String.raw`-\frac{b}{2a}-\frac{\sqrt{b^2-4ac}}{2a}`);
    expect(normalize(String.raw`-\frac{b}{2a}-\frac{-\sqrt{b^2+-4ac}}{2a}`))
      .toBe(String.raw`-\frac{b}{2a}+\frac{\sqrt{b^2-4ac}}{2a}`);
    expect(normalize(String.raw`\frac{-b-\sqrt{b^2-4ac}}{2a}`))
      .toBe(String.raw`\frac{-b-\sqrt{b^2-4ac}}{2a}`);
  });

  it('cleans sign noise inside square-root radicands without algebraic simplification', () => {
    expect(normalize(String.raw`\sqrt{1+-4\left(-\frac{1}{2}-\frac{\sqrt{5}}{2}\right)}`))
      .toBe(String.raw`\sqrt{1-4\left(-\frac{1}{2}-\frac{\sqrt{5}}{2}\right)}`);
    expect(normalize(String.raw`\sqrt{1+\left(-4\right)\left(a+b\right)}`))
      .toBe(String.raw`\sqrt{1-4\left(a+b\right)}`);
    expect(normalize(String.raw`\sqrt{\frac{-1}{2}+\frac{-1}{2}\sqrt{5}}`))
      .toBe(String.raw`\sqrt{-\frac{1}{2}-\frac{1}{2}\sqrt{5}}`);
    expect(normalize(String.raw`\sqrt{a^2-b^2}`))
      .toBe(String.raw`\sqrt{a^2-b^2}`);
  });

  it('orders external symbolic coefficients before radicals without extracting from radicals', () => {
    expect(normalize(String.raw`\sqrt{v+b}c`)).toBe(String.raw`c\sqrt{v+b}`);
    expect(normalize(String.raw`c\sqrt{v+b}`)).toBe(String.raw`c\sqrt{v+b}`);
  });
});
