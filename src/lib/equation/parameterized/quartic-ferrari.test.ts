import { describe, expect, it } from 'vitest';
import {
  solveParameterizedQuarticFerrariEquation,
  solveParameterizedRealQuarticFerrariEquation,
} from './quartic-ferrari';

function expectComplexSuccess(latex: string, target = 'x') {
  const result = solveParameterizedQuarticFerrariEquation(latex, target);
  if (result.kind !== 'success') {
    throw new Error(`Expected Complex Ferrari success, got ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectRealSuccess(latex: string, target = 'x') {
  const result = solveParameterizedRealQuarticFerrariEquation(latex, target);
  if (result.kind !== 'success') {
    throw new Error(`Expected Real Ferrari success, got ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectUnsupported(latex: string, target = 'x') {
  const result = solveParameterizedQuarticFerrariEquation(latex, target);
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected Ferrari unsupported, got ${result.exactLatex}`);
  }
  return result;
}

describe('Quartic Ferrari solver', () => {
  it('returns four compact symbolic Complex Ferrari branches', () => {
    const result = expectComplexSuccess('a*x^4+b*x^3+c*x^2+d*x+f=0');

    expect(result.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{2}`);
    expect(result.exactLatex).toContain('F_{+}');
    expect(result.exactLatex).toContain('F_{-}');
    expect(result.branchReadback?.source).toBe('equation-quartic-ferrari');
    expect(result.branchReadback?.branchesLatex).toHaveLength(4);
    expect(result.exactSupplementLatex).toEqual(['a\\ne0', 'U\\ne0', 'S\\ne0']);
    expect(result.detailSections.find((section) => section.title === 'Ferrari Definitions')?.lines.join(' '))
      .toContain(String.raw`U=\operatorname{PrincipalRoot}_{3}\left(R\right)`);
  });

  it('returns Real Ferrari case rows without Complex principal-root notation', () => {
    const result = expectRealSuccess('a*x^4+b*x^3+c*x^2+d*x+f=0');

    expect(result.exactLatex).toContain(String.raw`\begin{cases}`);
    expect(result.exactLatex).not.toContain('PrincipalRoot');
    expect(result.exactSupplementLatex).toEqual(['a\\ne0']);
    expect(result.detailSections.find((section) => section.title === 'Real Ferrari Definitions')?.lines.join(' '))
      .toContain('Y=-\\frac{5p}{6}+t');
    const cases = result.detailSections.find((section) => section.title === 'Real Ferrari Cases');
    expect(cases?.lineParts).toBeDefined();
    expect(cases?.lines.join(' ')).toContain('\\Delta<0');
  });

  it('supports non-x selected targets', () => {
    const result = expectRealSuccess('a*z^4+b*z^3+c*z^2+d*z+f=0', 'z');

    expect(result.target).toBe('z');
    expect(result.exactLatex).toContain(String.raw`z\in\begin{cases}`);
  });

  it('uses the biquadratic special form when q is zero', () => {
    const complex = expectComplexSuccess('x^4+p*x^2+r=0');
    expect(complex.exactLatex).toContain('s_{+}');
    expect(complex.exactLatex).toContain('s_{-}');
    expect(complex.exactLatex).not.toContain('U');
    expect(complex.exactSupplementLatex ?? []).toEqual([]);

    const real = expectRealSuccess('x^4+p*x^2+r=0');
    expect(real.detailSections.find((section) => section.title === 'Real Ferrari Cases')?.lines.join(' '))
      .toContain('s_{+}\\ge0');
    expect(real.exactLatex).not.toContain('PrincipalRoot');
  });

  it('keeps unsupported shape reasons explicit', () => {
    expect(expectUnsupported('x^3+a=0')).toMatchObject({ reason: 'not-quartic' });
    expect(expectUnsupported('x^5+a=0')).toMatchObject({ reason: 'degree-limit' });
    expect(expectUnsupported('\\frac{1}{x}=a')).toMatchObject({ reason: 'target-in-denominator' });
    expect(expectUnsupported('\\sin\\left(x\\right)=a')).toMatchObject({
      reason: 'target-in-unsupported-family',
    });
  });
});
