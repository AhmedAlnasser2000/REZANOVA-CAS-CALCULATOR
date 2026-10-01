import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR } from '../contracts';
import { compileGraphExpression } from './compile';
import { createGraphDoubleDoubleEvaluator, dd, ddExp, ddLog, ddSinCos, ddToNumber } from './double-double';

const plan = (mathJson: unknown) => {
  const compiled = compileGraphExpression({ planId: 'p', sourceRevision: 0, expression: { mathJson, freeSymbols: ['x'] } as GraphExpressionIR });
  if (!compiled.ok) throw new Error('compile');
  return compiled.plan;
};

describe('double-double escalation lane', () => {
  it('computes e, ln 2 and sin 1 to about 32 digits', () => {
    const e = ddExp(dd(1));
    expect(e.hi).toBe(Math.E);
    expect(Math.abs(e.lo - 1.4456468917292502e-16)).toBeLessThan(1e-28);
    const ln2 = ddLog(dd(2));
    expect(ln2.hi).toBe(Math.LN2);
    expect(Math.abs(ln2.lo - 2.3190468138462996e-17)).toBeLessThan(1e-31);
    // sin 1 = 0.84147098480789650665…; its tail past the double 0.8414709848078965 is 1.776845092935536e−18 (from 60-digit arithmetic).
    const sin1 = ddSinCos(dd(1)).sin;
    expect(sin1.hi).toBe(0.8414709848078965);
    expect(Math.abs(sin1.lo - 1.776845092935536e-18)).toBeLessThan(1e-31);
  });

  it('decides (eˣ − 1)/x at x = 1e−12, where doubles lose four digits', () => {
    const quotient = plan(['Divide', ['Add', ['Exp', 'x'], -1], 'x']);
    const result = createGraphDoubleDoubleEvaluator(quotient).evaluate({ x: 1e-12 })!;
    // (e^h − 1)/h = 1 + h/2 + h²/6 + …
    const exact = 1 + 5e-13;
    expect(Math.abs(ddToNumber(result.value) - exact)).toBeLessThan(1e-20);
    // The bound is conservative (library error 2^-88 relative, divided by x): it still supports 14 digits.
    expect(result.error).toBeLessThan(1e-13);
    expect(Math.abs(ddToNumber(result.value) - exact)).toBeLessThanOrEqual(result.error);
    // Plain doubles: (Math.exp(1e-12) − 1)/1e-12 is off in the fifth digit.
    expect(Math.abs((Math.exp(1e-12) - 1) / 1e-12 - exact)).toBeGreaterThan(1e-5);
  });

  it('declines operations outside the lane and undefined points', () => {
    expect(createGraphDoubleDoubleEvaluator(plan(['Arcsin', 'x'])).evaluate({ x: 0.5 })).toBeNull();
    expect(createGraphDoubleDoubleEvaluator(plan(['Ln', 'x'])).evaluate({ x: -1 })).toBeNull();
    expect(createGraphDoubleDoubleEvaluator(plan(['Divide', 1, 'x'])).evaluate({ x: 0 })).toBeNull();
  });
});
