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
  it('solves direct symbolic powers through compact PrincipalRoot omega branches', () => {
    const square = expectSuccess('x^2=a');
    const cube = expectSuccess('x^3+q=0');
    const quartic = expectSuccess('x^4=a');
    const result = expectSuccess('x^5=a');
    const shiftedZero = expectSuccess('x^5+a=0');

    expect(square.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{2}\left(a\right)\omega_{0}`);
    expect(square.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{2}\left(a\right)\omega_{1}`);
    expect(cube.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{3}\left(-q\right)\omega_{0}`);
    expect(cube.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{3}\left(-q\right)\omega_{2}`);
    expect(quartic.branchReadback?.branchesLatex).toHaveLength(4);
    expect(result.answerDomain).toBe('complex');
    expect(result.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)\omega_{0}`);
    expect(result.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)\omega_{4}`);
    expect(result.exactLatex).not.toContain(String.raw`\cos\left(\frac{2\pi}{5}\right)+i\sin\left(\frac{2\pi}{5}\right)`);
    expect(result.branchReadback?.branchesLatex).toHaveLength(5);
    expect(result.branchReadback?.branchesLatex[0]).toBe(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)\omega_{0}`);
    const definitions = result.detailSections?.find((section) => section.title === 'Complex Power Definitions');
    expect(definitions?.lines.join(' ')).toContain(String.raw`\omega_{1}=\cos\left(\frac{2\pi}{5}\right)+i\sin\left(\frac{2\pi}{5}\right)`);
    expect(JSON.stringify(result)).not.toContain('RootOf');
    expect(result.exactLatex).not.toContain(String.raw`\sqrt[5]{a}`);
    expect(shiftedZero.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(-a\right)\omega_{0}`);
  });

  it('honors cis notation for symbolic principal-root omega definitions', () => {
    const result = expectSuccess('x^5=a', { complexExactForm: 'cis' });
    const definitions = result.detailSections?.find((section) => section.title === 'Complex Power Definitions');

    expect(result.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)\omega_{1}`);
    expect(result.exactLatex).not.toContain(String.raw`\operatorname{cis}\left(\frac{2\pi}{5}\right)`);
    expect(result.exactLatex).not.toContain(String.raw`\cos\left(\frac{2\pi}{5}\right)`);
    expect(definitions?.lines.join(' ')).toContain(String.raw`\omega_{1}=\operatorname{cis}\left(\frac{2\pi}{5}\right)`);
    expect(definitions?.lines.join(' ')).not.toContain(String.raw`\omega_{1}=\cos\left(\frac{2\pi}{5}\right)`);
  });

  it('solves direct affine symbolic carrier powers by back-substitution', () => {
    const lowDegreeShifted = expectSuccess('(x+c)^3=a');
    const lowDegreeScaled = expectSuccess('(2*x-1)^4=a');
    const shifted = expectSuccess('(x+c)^5=a');
    const scaled = expectSuccess('(2*x-1)^6=a');

    expect(lowDegreeShifted.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{3}\left(a\right)\omega_{0}-c`);
    expect(lowDegreeShifted.branchReadback?.branchesLatex).toHaveLength(3);
    expect(lowDegreeScaled.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{4}\left(a\right)\omega_{0}+1`);
    expect(lowDegreeScaled.branchReadback?.branchesLatex).toHaveLength(4);
    expect(shifted.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)\omega_{0}-c`);
    expect(shifted.branchReadback?.branchesLatex).toHaveLength(5);
    expect(scaled.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{6}\left(a\right)\omega_{0}`);
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
