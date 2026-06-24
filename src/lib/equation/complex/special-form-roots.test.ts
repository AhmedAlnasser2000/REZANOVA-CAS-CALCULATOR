import { describe, expect, it } from 'vitest';
import { solveComplexSpecialFormRootsEquation } from './special-form-roots';

function expectSuccess(latex: string, options: Parameters<typeof solveComplexSpecialFormRootsEquation>[2] = {}) {
  const result = solveComplexSpecialFormRootsEquation(latex, 'x', options);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success, got ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectUnsupported(latex: string) {
  const result = solveComplexSpecialFormRootsEquation(latex, 'x');
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, got ${result.exactLatex}`);
  }
  return result;
}

describe('Complex symbolic special-form roots', () => {
  it('solves direct symbolic powers through explicit PrincipalRoot branches', () => {
    const result = expectSuccess('x^5=a');
    const shiftedZero = expectSuccess('x^5+a=0');

    expect(result.answerDomain).toBe('complex');
    expect(result.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)`);
    expect(result.exactLatex).toContain(String.raw`\cos\left(\frac{2\pi}{5}\right)+i\sin\left(\frac{2\pi}{5}\right)`);
    expect(result.branchReadback?.branchesLatex).toHaveLength(5);
    expect(result.branchReadback?.branchesLatex[0]).toBe(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)`);
    expect(JSON.stringify(result)).not.toContain('RootOf');
    expect(result.exactLatex).not.toContain(String.raw`\sqrt[5]{a}`);
    expect(shiftedZero.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(-a\right)`);
  });

  it('honors cis notation for symbolic principal-root branch multipliers', () => {
    const result = expectSuccess('x^5=a', { complexExactForm: 'cis' });

    expect(result.exactLatex).toContain(String.raw`\operatorname{cis}\left(\frac{2\pi}{5}\right)`);
    expect(result.exactLatex).not.toContain(String.raw`\cos\left(\frac{2\pi}{5}\right)`);
  });

  it('solves direct affine symbolic carrier powers by back-substitution', () => {
    const shifted = expectSuccess('(x+c)^5=a');
    const scaled = expectSuccess('(2*x-1)^6=a');

    expect(shifted.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)-c`);
    expect(shifted.branchReadback?.branchesLatex).toHaveLength(5);
    expect(scaled.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{6}\left(a\right)`);
    expect(scaled.exactLatex).toContain(String.raw`\frac{`);
    expect(scaled.branchReadback?.branchesLatex).toHaveLength(6);
  });

  it('keeps degree and symbolic-coefficient boundaries honest', () => {
    expect(expectUnsupported('x^{13}=a')).toMatchObject({
      reason: 'total-degree-limit',
    });
    expect(expectUnsupported('a*x^5=b')).toMatchObject({
      reason: 'symbolic-coefficients',
    });
    expect(expectUnsupported('x^6-a*x^3+b=0')).toMatchObject({
      reason: 'symbolic-coefficients',
    });
    expect(expectUnsupported('x^6-a*x^3+b=0').message).toContain('principal-branch root policy');
  });
});
