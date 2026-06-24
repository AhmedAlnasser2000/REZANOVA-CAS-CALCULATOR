import { describe, expect, it } from 'vitest';
import { solveParameterizedFactorablePolynomialEquation } from './factorable-polynomial';
import { solveParameterizedCubicCardanoEquation } from './cubic-cardano';

function expectSuccess(latex: string, target: string, options = {}) {
  const result = solveParameterizedCubicCardanoEquation(latex, target, options);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected Cardano success, got ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedCubicCardanoEquation(latex, target);
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected Cardano unsupported, got ${result.exactLatex}`);
  }
  return result;
}

describe('solveParameterizedCubicCardanoEquation', () => {
  it('returns three symbolic Complex Cardano branches with PrincipalRoot_3', () => {
    const result = expectSuccess('a*x^3+b*x^2+c*x+d=0', 'x', {
      complexExactForm: 'cis',
    });

    expect(result.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{3}`);
    expect(result.exactLatex).toContain(String.raw`\operatorname{cis}`);
    expect(result.branchReadback?.branchesLatex).toHaveLength(3);
    expect(result.branchReadback?.source).toBe('equation-cubic-cardano');
    expect(result.exactSupplementLatex?.[0]).toContain(String.raw`a\ne0`);
    expect(result.exactSupplementLatex?.join(' ')).toContain(String.raw`\ne0`);
    expect(JSON.stringify(result)).not.toContain('RootOf');
  });

  it('renders depressed cubic p/q/Delta structure', () => {
    const result = expectSuccess('x^3+p*x+q=0', 'x');
    const detail = result.detailSections.flatMap((section) => section.lines).join(' ');

    expect(result.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{3}`);
    expect(detail).toContain('p=p');
    expect(detail).toContain('q=q');
    expect(detail).toContain('Cardano discriminant');
  });

  it('uses the p=0 branch form without Cardano denominator facts', () => {
    const result = expectSuccess('x^3+q=0', 'x');
    const branches = result.branchReadback?.branchesLatex.join(' ') ?? '';

    expect(branches).toContain(String.raw`\operatorname{PrincipalRoot}_{3}`);
    expect(branches).toContain('-q');
    expect(branches).not.toContain(String.raw`\frac{0}`);
    expect(result.exactSupplementLatex).toBeUndefined();
  });

  it('keeps non-cubic and unsupported shapes explicit', () => {
    expect(expectUnsupported('a*x^4+b*x^3+c*x^2+d*x+f=0', 'x')).toMatchObject({
      reason: 'ferrari-deferred',
    });
    expect(expectUnsupported('x^5+a=0', 'x')).toMatchObject({
      reason: 'degree-limit',
    });
    expect(expectUnsupported('\\frac{1}{x}=a', 'x')).toMatchObject({
      reason: 'target-in-denominator',
    });
    expect(expectUnsupported('\\sin\\left(x\\right)=a', 'x')).toMatchObject({
      reason: 'target-in-unsupported-family',
    });
  });

  it('leaves exact-rational factorable cubics to the factorable route', () => {
    const factorable = solveParameterizedFactorablePolynomialEquation('x^3-6*x^2+11*x-6=0', 'x', {
      allowGeneratedImplicitProducts: true,
    });

    expect(factorable.kind).toBe('success');
    if (factorable.kind !== 'success') {
      throw new Error(`Expected factorable success, got ${factorable.reason}`);
    }
    expect(factorable.detailSections.some((section) =>
      section.title === 'Parameterized Factorable Polynomial Solve')).toBe(true);
    expect(factorable.exactLatex).toContain('1');
    expect(factorable.exactLatex).toContain('2');
    expect(factorable.exactLatex).toContain('3');
  });
});
