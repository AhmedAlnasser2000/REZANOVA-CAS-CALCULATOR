import { describe, expect, it } from 'vitest';
import { evaluateCalculusImplicitDerivative } from './implicit-derivative';

describe('evaluateCalculusImplicitDerivative', () => {
  it('differentiates a circle relation and isolates dy/dx through Equation', () => {
    const result = evaluateCalculusImplicitDerivative({
      relationLatex: 'x^2+y^2=25',
      independentVariable: 'x',
      dependentVariable: 'y',
    });

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('\\frac{dy}{dx}=-\\frac{x}{y}');
    expect(result.exactSupplementLatex).toContain('2y\\ne0');
    expect(result.detailSections?.[0]?.title).toBe('Implicit Differentiation');
    expect(result.detailSections?.[0]?.lines).toContain(
      '\\operatorname{differentiated}\\quad 2uy+2x=0',
    );
  });

  it('handles product and chain rule terms before Equation isolation', () => {
    const result = evaluateCalculusImplicitDerivative({
      relationLatex: 'xy+\\sin(y)=x',
      independentVariable: 'x',
      dependentVariable: 'y',
    });

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('\\frac{dy}{dx}=\\frac{1-y}{x+\\cos(y)}');
    expect(result.derivativeStrategies).toEqual(expect.arrayContaining([
      'product-rule',
      'chain-rule',
    ]));
  });

  it('requires one equation relation', () => {
    const result = evaluateCalculusImplicitDerivative({
      relationLatex: 'x^2+y^2',
      independentVariable: 'x',
      dependentVariable: 'y',
    });

    expect(result.error).toBe('Implicit differentiation expects one equation, such as x^2+y^2=25.');
  });

  it('rejects matching independent and dependent variables', () => {
    const result = evaluateCalculusImplicitDerivative({
      relationLatex: 'x^2=1',
      independentVariable: 'x',
      dependentVariable: 'x',
    });

    expect(result.error).toBe('Choose different independent and dependent variables.');
  });
});
