import { describe, expect, it } from 'vitest';
import { solveParameterizedPolynomialEquation } from './polynomial';

function expectSuccess(latex: string, target: string) {
  const result = solveParameterizedPolynomialEquation(latex, target);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedPolynomialEquation(latex, target);
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  return result;
}

describe('solveParameterizedPolynomialEquation', () => {
  it('solves square equals parameter families with real-domain facts', () => {
    const result = expectSuccess('z^2-a=0', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('-\\sqrt{a}');
    expect(result.exactLatex).toContain('\\sqrt{a}');
    expect(result.primaryMath?.canonicalLatex).toBe(result.exactLatex);
    expect(result.primaryMath?.mathJson).toBeDefined();
    expect(result.exactSupplementLatex).toEqual(['a\\ge0']);
  });

  it('solves quadratic-in-target equations with explicit parameter products', () => {
    const result = expectSuccess('z^2+x z+1=0', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('x^2-4');
    expect(result.exactSupplementLatex).toEqual(['x^2-4\\ge0']);
    expect(result.detailSections[0].lines.join(' ')).toContain('Symbolic parameters: x');
  });

  it('keeps symbolic leading coefficient and discriminant facts', () => {
    const result = expectSuccess('a z^2+b z+c=0', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('b^2-4ac');
    expect(result.exactLatex).not.toContain(String.raw`+\frac{-\sqrt`);
    expect(result.exactLatex).not.toContain('+-');
    expect(result.exactLatex).toContain(String.raw`-\frac{\sqrt{b^2-4ac}}{2a}`);
    expect(result.exactLatex).toContain(String.raw`\frac{\sqrt{b^2-4ac}}{2a}`);
    const branches = result.branchReadback?.branchesLatex.join(' ') ?? '';
    expect(branches).not.toContain(String.raw`+\frac{-\sqrt`);
    expect(branches).toContain(String.raw`-\frac{\sqrt{b^2-4ac}}{2a}`);
    expect(result.exactSupplementLatex).toEqual(['a\\ne0', 'b^2-4ac\\ge0']);
  });

  it('preserves case-sensitive parameterized targets', () => {
    const result = expectSuccess('K^2-k=0', 'K');

    expect(result.exactLatex).toContain('K\\in');
    expect(result.exactLatex).toContain('\\sqrt{k}');
    expect(result.exactSupplementLatex).toEqual(['k\\ge0']);
  });

  it('supports explicit multiplication and rejects raw adjacent-letter products', () => {
    const explicit = expectSuccess('x z^2+1=0', 'z');
    expect(explicit.exactLatex).toContain('z\\in');
    expect(explicit.exactSupplementLatex?.join(' ')).toContain('x\\ne0');

    const raw = expectUnsupported('xz^2+1=0', 'z');
    expect(raw.reason).toBe('ambiguous-adjacent-product');
    expect(raw.message).toContain('explicit multiplication');
  });

  it('stops higher-degree polynomial families for a later slice', () => {
    const result = expectUnsupported('z^3+a=0', 'z');

    expect(result.reason).toBe('target-power');
    expect(result.message).toContain('above degree 2');
  });

  it('stops target-denominator equations for the rational parameterized slice', () => {
    const result = expectUnsupported('\\frac{1}{z}=a', 'z');

    expect(result.reason).toBe('target-in-denominator');
    expect(result.message).toContain('EQUATION-PARAM3');
  });

  it('stops target-inside-function equations for later bounded families', () => {
    const result = expectUnsupported('\\sin\\left(z\\right)=a', 'z');

    expect(result.reason).toBe('target-in-unsupported-operation');
    expect(result.message).toContain('outside EQUATION-PARAM2');
  });
});
