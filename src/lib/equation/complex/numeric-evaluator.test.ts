import { describe, expect, it } from 'vitest';
import { complex } from '../../numeric/complex';
import { createComplexNumericEvaluator } from './numeric-evaluator';

describe('Complex numeric evaluator', () => {
  it('evaluates target-aware equation residuals without assuming x', () => {
    const evaluator = createComplexNumericEvaluator({
      expressionLatex: 'w^2+1=0',
      target: 'w',
    });

    const result = evaluator.evaluateAt(complex(0, 1));

    expect(result.status).toBe('finite');
    expect(result.value?.re).toBeCloseTo(0);
    expect(result.value?.im).toBeCloseTo(0);
    expect(result.residualNorm).toBeLessThan(1e-10);
    expect(result.evaluationCount).toBeGreaterThan(0);
  });

  it('uses explicit complex parameter values and reports unresolved symbols', () => {
    const withParameter = createComplexNumericEvaluator({
      expressionLatex: 'z+a=0',
      target: 'z',
      parameters: { a: complex(1, -2) },
    }).evaluateAt(complex(-1, 2));
    const missingParameter = createComplexNumericEvaluator({
      expressionLatex: 'z+a=0',
      target: 'z',
    }).evaluateAt(complex(-1, 2));

    expect(withParameter.status).toBe('finite');
    expect(withParameter.residualNorm).toBeLessThan(1e-10);
    expect(missingParameter.status).toBe('unsupported');
    expect(missingParameter.diagnostics.map((entry) => entry.code)).toContain('complex-unresolved-symbol');
  });

  it('uses principal log semantics and reports branch-cut contact', () => {
    const cut = createComplexNumericEvaluator({
      expressionLatex: String.raw`\ln(z)`,
      target: 'z',
    }).evaluateAt(complex(-1, 0));
    const branchPoint = createComplexNumericEvaluator({
      expressionLatex: String.raw`\ln(z)`,
      target: 'z',
    }).evaluateAt(complex(0, 0));

    expect(cut.status).toBe('finite');
    expect(cut.value?.re).toBeCloseTo(0);
    expect(cut.value?.im).toBeCloseTo(Math.PI);
    expect(cut.diagnostics.map((entry) => entry.code)).toContain('complex-branch-cut');
    expect(branchPoint.status).toBe('undefined');
    expect(branchPoint.diagnostics.map((entry) => entry.code)).toContain('complex-branch-point');
  });

  it('uses principal roots and fractional powers with diagnostics near cuts', () => {
    const root = createComplexNumericEvaluator({
      expressionLatex: String.raw`\sqrt{z}`,
      target: 'z',
    }).evaluateAt(complex(-4, 0));
    const fractionalPower = createComplexNumericEvaluator({
      expressionLatex: 'z^{1/2}',
      target: 'z',
    }).evaluateAt(complex(-4, 0));

    expect(root.status).toBe('finite');
    expect(root.value?.re).toBeCloseTo(0);
    expect(root.value?.im).toBeCloseTo(2);
    expect(root.diagnostics.map((entry) => entry.code)).toContain('complex-branch-cut');
    expect(fractionalPower.status).toBe('finite');
    expect(fractionalPower.value?.re).toBeCloseTo(0);
    expect(fractionalPower.value?.im).toBeCloseTo(2);
    expect(fractionalPower.diagnostics.map((entry) => entry.code)).toContain('complex-branch-cut');
  });

  it('supports exp, trig, base logs, and principal inverse trig where finite', () => {
    const expFixedPoint = createComplexNumericEvaluator({
      expressionLatex: String.raw`e^z-1=0`,
      target: 'z',
    }).evaluateAt(complex(0, 0));
    const baseLog = createComplexNumericEvaluator({
      expressionLatex: String.raw`\log_2(z)-3=0`,
      target: 'z',
    }).evaluateAt(complex(8, 0));
    const sine = createComplexNumericEvaluator({
      expressionLatex: String.raw`\sin(z)`,
      target: 'z',
    }).evaluateAt(complex(Math.PI, 0));
    const inverseSine = createComplexNumericEvaluator({
      expressionLatex: String.raw`\arcsin(z)`,
      target: 'z',
    }).evaluateAt(complex(2, 0));

    expect(expFixedPoint.status).toBe('finite');
    expect(expFixedPoint.residualNorm).toBeLessThan(1e-10);
    expect(baseLog.status).toBe('finite');
    expect(baseLog.residualNorm).toBeLessThan(1e-10);
    expect(sine.status).toBe('finite');
    expect(sine.residualNorm).toBeLessThan(1e-10);
    expect(inverseSine.status).toBe('finite');
    expect(inverseSine.diagnostics.map((entry) => entry.code)).toContain('complex-inverse-trig-cut');
  });

  it('reports overflow instead of returning non-finite values', () => {
    const result = createComplexNumericEvaluator({
      expressionLatex: String.raw`e^z`,
      target: 'z',
    }).evaluateAt(complex(1000, 0));

    expect(result.status).toBe('overflow');
    expect(result.value).toBeNull();
    expect(result.diagnostics.map((entry) => entry.code)).toContain('complex-overflow');
  });

  it('exposes bounded analytic derivatives for supported numeric families', () => {
    const polynomial = createComplexNumericEvaluator({
      expressionLatex: 'z^2+1=0',
      target: 'z',
    });
    const exponential = createComplexNumericEvaluator({
      expressionLatex: 'e^z+z=0',
      target: 'z',
    });

    const polynomialDerivative = polynomial.evaluateDerivativeAt?.(complex(2, 0));
    const exponentialDerivative = exponential.evaluateDerivativeAt?.(complex(0, Math.PI));

    expect(polynomialDerivative?.status).toBe('finite');
    expect(polynomialDerivative?.value?.re).toBeCloseTo(4);
    expect(polynomialDerivative?.value?.im).toBeCloseTo(0);
    expect(exponentialDerivative?.status).toBe('finite');
    expect(exponentialDerivative?.value?.re).toBeCloseTo(0);
    expect(exponentialDerivative?.value?.im).toBeCloseTo(0);
  });
});
