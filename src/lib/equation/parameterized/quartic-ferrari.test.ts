import { describe, expect, it } from 'vitest';
import {
  solveParameterizedQuarticFerrariEquation,
  solveParameterizedRealQuarticFerrariEquation,
} from './quartic-ferrari';
import { solveParameterizedRationalQuarticFerrariEquation } from './formula-rational-normalization';

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

function expectRationalFerrariSuccess(
  latex: string,
  target: string,
  options: Parameters<typeof solveParameterizedRationalQuarticFerrariEquation>[2],
) {
  const result = solveParameterizedRationalQuarticFerrariEquation(latex, target, options);
  if (result.kind !== 'success') {
    throw new Error(`Expected rational Ferrari success, got ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectRationalFerrariUnsupported(
  latex: string,
  target: string,
  options: Parameters<typeof solveParameterizedRationalQuarticFerrariEquation>[2],
) {
  const result = solveParameterizedRationalQuarticFerrariEquation(latex, target, options);
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected rational Ferrari unsupported, got ${result.exactLatex}`);
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
    expect(complex.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{2}`);
    expect(complex.exactLatex).toContain('p');
    expect(complex.exactLatex).toContain('r');
    expect(complex.exactLatex).not.toContain(String.raw`-\frac{A}{4}`);
    expect(complex.exactLatex).not.toContain('U');
    expect(complex.exactSupplementLatex ?? []).toEqual([]);

    const real = expectRealSuccess('x^4+p*x^2+r=0');
    const realDefinitions = real.detailSections.find((section) => section.title === 'Substituted Real Ferrari Values');
    expect(real.detailSections.find((section) => section.title === 'Real Ferrari Cases')?.lines.join(' '))
      .toContain('p');
    expect(realDefinitions?.lines.join(' ')).toContain(String.raw`x=\pm\sqrt{s_{\pm}}`);
    expect(realDefinitions?.lines.join(' ')).not.toContain('x=0');
    expect(realDefinitions?.lines.join(' ')).not.toContain(String.raw`\sqrt\left`);
    expect(real.exactLatex).toContain(String.raw`\frac{-p+\sqrt{p^2-4r}}{2}`);
    expect(real.exactLatex).not.toContain('0+');
    expect(real.exactLatex).not.toContain(String.raw`-\frac{A}{4}`);
    expect(real.exactLatex).not.toContain('PrincipalRoot');
  });

  it('renders mixed symbolic quartics as coefficient-substituted Ferrari output', () => {
    const complex = expectComplexSuccess('x^4+p*x+2=0');
    const complexDefinitions = complex.detailSections.find((section) => section.title === 'Substituted Ferrari Values');

    expect(complex.exactLatex).toContain('p');
    expect(complex.exactLatex).toContain('Y');
    expect(complex.exactLatex).not.toContain(String.raw`-\frac{A}{4}`);
    expect(complex.exactLatex).not.toContain('F_{+}');
    expect(complexDefinitions?.lines.join(' ')).toContain('q=p');
    expect(complexDefinitions?.lines.join(' ')).toContain('r=2');

    const real = expectRealSuccess('x^4+p*x+2=0');
    const realDefinitions = real.detailSections.find((section) => section.title === 'Substituted Real Ferrari Values');

    expect(real.exactLatex).toContain('p');
    expect(real.exactLatex).toContain('Y');
    expect(real.exactLatex).not.toContain(String.raw`-\frac{A}{4}`);
    expect(realDefinitions?.lines.join(' ')).toContain('q=p');
    expect(realDefinitions?.lines.join(' ')).toContain('r=2');
  });

  it('keeps unsupported shape reasons explicit', () => {
    expect(expectUnsupported('x^3+a=0')).toMatchObject({ reason: 'not-quartic' });
    expect(expectUnsupported('x^5+a=0')).toMatchObject({ reason: 'degree-limit' });
    expect(expectUnsupported('\\frac{1}{x}=a')).toMatchObject({ reason: 'target-in-denominator' });
    expect(expectUnsupported('\\sin\\left(x\\right)=a')).toMatchObject({
      reason: 'target-in-unsupported-family',
    });
  });

  it('clears top-level rational quartics into the Complex Ferrari route with exclusions', () => {
    const result = expectRationalFerrariSuccess(
      String.raw`\frac{a*x^4+b*x^3+c*x^2+d*x+f}{x-m}=0`,
      'x',
      { domain: 'complex' },
    );

    expect(result.clearedEquationLatex).toContain('x^4');
    expect(result.branchReadback?.source).toBe('equation-quartic-ferrari');
    expect(result.branchReadback?.branchesLatex).toHaveLength(4);
    expect(result.exactSupplementLatex).toContain(String.raw`x-m\ne0`);
    expect(result.exactSupplementLatex).toContain(String.raw`a\ne0`);
    expect(result.exactSupplementLatex).toContain(String.raw`U\ne0`);
    expect(result.exactSupplementLatex).toContain(String.raw`S\ne0`);
    expect(result.detailSections.some((section) => section.title === 'Quartic Rational Normalization')).toBe(true);
  });

  it('clears top-level rational quartics into the Real Ferrari route with case rows', () => {
    const result = expectRationalFerrariSuccess(
      String.raw`\frac{x^4+x+1}{x-m}=0`,
      'x',
      { domain: 'real' },
    );

    expect(result.exactLatex).toContain(String.raw`x\in\begin{cases}`);
    expect(result.exactLatex).not.toContain('PrincipalRoot');
    expect(result.exactSupplementLatex).toContain(String.raw`x-m\ne0`);
    expect(result.detailSections.some((section) => section.title === 'Real Ferrari Cases')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Quartic Rational Normalization')).toBe(true);
  });

  it('keeps non-quartic and over-cap rational Ferrari shapes stopped honestly', () => {
    expect(expectRationalFerrariUnsupported(
      String.raw`\frac{x^3+x+1}{x-m}=0`,
      'x',
      { domain: 'real' },
    )).toMatchObject({ reason: 'not-quartic' });

    expect(expectRationalFerrariUnsupported(
      String.raw`\frac{x^5+x+1}{x-m}=0`,
      'x',
      { domain: 'complex' },
    )).toMatchObject({ reason: 'degree-limit' });
  });
});
