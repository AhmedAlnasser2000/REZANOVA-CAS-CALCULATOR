import { describe, expect, it } from 'vitest';
import { createComplexNumericEvaluator } from '../../equation/complex-domain-public';
import { complex } from '../../numeric/complex';
import { adaptGraphExpressionMathJson, parseGraphLatexToStructuralMathJson } from '../parser/mathjson';
import { compileGraphComplexPlan } from './complex-plan';

function canonical(latex: string) {
  const parsed = parseGraphLatexToStructuralMathJson(latex);
  if (!parsed.ok) throw new Error(`parse ${latex}`);
  const adapted = adaptGraphExpressionMathJson(parsed.mathJson);
  if (!adapted.ok) throw new Error(`adapt ${latex}: ${adapted.stopReason.detailCode}`);
  return adapted.expression.mathJson;
}

const EXPRESSIONS = [
  'z^2+z-3', String.raw`\frac{z^3}{z^2+1}`, String.raw`|z-1|`, String.raw`\operatorname{Re}(z^2)`, String.raw`\Im(z)`,
  String.raw`\arg(z)`, String.raw`\overline{z}+2iz`, String.raw`e^{z}-2`, String.raw`\ln(z)`, String.raw`\sqrt{z}`,
  String.raw`\sin(z)\cos(z)`, String.raw`\tan(z)`, String.raw`z^{1/3}`, String.raw`z^{i}`, String.raw`\sinh(z)+\cosh(z)`,
  String.raw`\sqrt[3]{z}`, String.raw`a z^2`, String.raw`\frac{1}{z}`,
];

describe('fast complex plan', () => {
  it.each(EXPRESSIONS)('matches the public complex evaluator for %s', (latex) => {
    const mathJson = canonical(latex);
    const parameters = { a: 1.5 };
    const fast = compileGraphComplexPlan(mathJson, parameters);
    if (!fast.ok) throw new Error(fast.reason);
    const reference = createComplexNumericEvaluator({ expressionMathJson: mathJson, target: 'z', parameters });
    let compared = 0;
    for (let re = -2.3; re <= 2.3; re += 0.37) {
      for (let im = -2.1; im <= 2.1; im += 0.41) {
        const z = complex(re, im);
        const expected = reference.evaluateAt(z);
        const actual = fast.plan.evaluate(z);
        if (expected.status !== 'finite' || !expected.value) { expect(actual).toBeNull(); continue; }
        expect(actual).not.toBeNull();
        const scale = Math.max(1, Math.hypot(expected.value.re, expected.value.im));
        expect(Math.abs(actual!.re - expected.value.re) / scale).toBeLessThan(1e-9);
        expect(Math.abs(actual!.im - expected.value.im) / scale).toBeLessThan(1e-9);
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(80);
  });

  it('reports operators it does not cover so callers can fall back', () => {
    expect(compileGraphComplexPlan(['Arcsin', 'z'])).toEqual({ ok: false, reason: 'operator:Arcsin' });
    expect(compileGraphComplexPlan(['Add', 'z', 'q'])).toEqual({ ok: false, reason: 'symbol:q' });
  });
});
