import { describe, expect, it } from 'vitest';
import { solveParameterizedLinearEquation } from './linear';

function expectSuccess(latex: string, target: string) {
  const result = solveParameterizedLinearEquation(latex, target);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedLinearEquation(latex, target);
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  return result;
}

describe('solveParameterizedLinearEquation', () => {
  it('solves for either target in a two-symbol affine equation', () => {
    const zResult = expectSuccess('x+z=5', 'z');
    expect(zResult.exactLatex).toBe('z=5-x');
    expect(zResult.primaryMath?.canonicalLatex).toBe(zResult.exactLatex);
    expect(zResult.primaryMath?.mathJson).toBeDefined();
    expect(expectSuccess('x+z=5', 'x').exactLatex).toBe('x=5-z');
  });

  it('preserves case-sensitive targets', () => {
    expect(expectSuccess('K+k=8', 'K').exactLatex).toBe('K=8-k');
    expect(expectSuccess('K+k=8', 'k').exactLatex).toBe('k=8-K');
  });

  it('solves scaled target equations with symbolic parameters', () => {
    const result = expectSuccess('2z+a=7', 'z');

    expect(result.exactLatex).toBe('z=\\frac{7-a}{2}');
    expect(result.exactSupplementLatex).toBeUndefined();
    expect(result.detailSections[0].lines.join(' ')).toContain('a');
  });

  it('keeps explicit parameter coefficients as nonzero facts', () => {
    const result = expectSuccess('a z+b=c', 'z');

    expect(result.exactLatex).toBe('z=\\frac{c-b}{a}');
    expect(result.exactSupplementLatex).toEqual(['a\\ne0']);
  });

  it('moves target terms from both sides into the coefficient', () => {
    const result = expectSuccess('a z+b=c z+d', 'z');

    expect(result.exactLatex).toBe('z=\\frac{d-b}{a-c}');
    expect(result.exactSupplementLatex).toEqual(['a-c\\ne0']);
  });

  it('supports explicit multiplication between a parameter and target', () => {
    const result = expectSuccess('x\\cdot z=1', 'z');

    expect(result.exactLatex).toBe('z=\\frac{1}{x}');
    expect(result.exactSupplementLatex).toEqual(['x\\ne0']);
  });

  it('rejects raw adjacent-letter products until variable hints can explain them', () => {
    const result = expectUnsupported('xz=1', 'z');

    expect(result.reason).toBe('ambiguous-adjacent-product');
    expect(result.message).toContain('explicit multiplication');
  });

  it('stops polynomial-in-target equations for the next parameterized slice', () => {
    const result = expectUnsupported('z^2+a=0', 'z');

    expect(result.reason).toBe('target-power');
    expect(result.message).toContain('EQUATION-PARAM2');
  });

  it('stops target-denominator equations for the rational parameterized slice', () => {
    const result = expectUnsupported('\\frac{1}{z}=a', 'z');

    expect(result.reason).toBe('target-in-denominator');
    expect(result.message).toContain('EQUATION-PARAM3');
  });

  it('stops target-inside-function equations for later bounded families', () => {
    const result = expectUnsupported('\\sin\\left(z\\right)=a', 'z');

    expect(result.reason).toBe('target-in-unsupported-operation');
    expect(result.message).toContain('outside EQUATION-PARAM1');
  });
});
