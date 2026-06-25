import { describe, expect, it } from 'vitest';
import { solveParameterizedFactorablePolynomialEquation } from './factorable-polynomial';
import {
  solveParameterizedCubicCardanoEquation,
  solveParameterizedRealCubicCardanoEquation,
} from './cubic-cardano';
import { solveParameterizedRationalCubicCardanoEquation } from './formula-rational-normalization';

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

function expectRealSuccess(latex: string, target: string, options = {}) {
  const result = solveParameterizedRealCubicCardanoEquation(latex, target, options);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected Real Cardano success, got ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectRealUnsupported(latex: string, target: string) {
  const result = solveParameterizedRealCubicCardanoEquation(latex, target);
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected Real Cardano unsupported, got ${result.exactLatex}`);
  }
  return result;
}

function expectRationalCardanoSuccess(
  latex: string,
  target: string,
  options: Parameters<typeof solveParameterizedRationalCubicCardanoEquation>[2],
) {
  const result = solveParameterizedRationalCubicCardanoEquation(latex, target, options);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected rational Cardano success, got ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectRationalCardanoUnsupported(
  latex: string,
  target: string,
  options: Parameters<typeof solveParameterizedRationalCubicCardanoEquation>[2],
) {
  const result = solveParameterizedRationalCubicCardanoEquation(latex, target, options);
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected rational Cardano unsupported, got ${result.exactLatex}`);
  }
  return result;
}

describe('solveParameterizedCubicCardanoEquation', () => {
  it('returns three compact symbolic Complex Cardano branches with definition-backed PrincipalRoot_3', () => {
    const result = expectSuccess('a*x^3+b*x^2+c*x+d=0', 'x', {
      complexExactForm: 'cis',
    });
    const definitions = result.detailSections.find((section) => section.title === 'Cardano Definitions');
    const definitionLatex = definitions?.lines.join(' ') ?? '';
    const branches = result.branchReadback?.branchesLatex ?? [];

    expect(result.exactLatex).toContain(String.raw`U_{0}`);
    expect(result.exactLatex).toContain(String.raw`U_{1}`);
    expect(result.exactLatex).toContain(String.raw`U_{2}`);
    expect(result.exactLatex).toContain(String.raw`-\frac{A}{3}`);
    expect(result.exactLatex).not.toContain(String.raw`\frac{b}{a}`);
    expect(result.exactLatex).not.toContain(String.raw`\operatorname{PrincipalRoot}_{3}`);
    expect(branches).toHaveLength(3);
    expect(branches.every((branch) => branch.length < 90)).toBe(true);
    expect(definitionLatex).toContain(String.raw`A=\frac{b}{a}`);
    expect(definitionLatex).toContain(String.raw`B=\frac{c}{a}`);
    expect(definitionLatex).toContain(String.raw`C=\frac{d}{a}`);
    expect(definitionLatex).toContain(String.raw`R=-\frac{q}{2}+\sqrt{\Delta}`);
    expect(definitionLatex).toContain(String.raw`U_{0}=\operatorname{PrincipalRoot}_{3}\left(R\right)\omega_{0}`);
    expect(definitionLatex).toContain(String.raw`\operatorname{cis}`);
    expect(result.branchReadback?.source).toBe('equation-cubic-cardano');
    expect(result.exactSupplementLatex).toEqual([String.raw`a\ne0`, String.raw`R\ne0`]);
    expect(JSON.stringify(result)).not.toContain('RootOf');
  });

  it('renders depressed cubic p/q/Delta structure', () => {
    const result = expectSuccess('x^3+p*x+q=0', 'x');
    const detail = result.detailSections.flatMap((section) => section.lines).join(' ');

    expect(result.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{3}`);
    expect(result.exactLatex).toContain('p');
    expect(result.exactLatex).toContain('q');
    expect(result.exactLatex).not.toContain(String.raw`U_{0}`);
    expect(result.exactLatex).not.toContain(String.raw`-\frac{A}{3}`);
    expect(detail).toContain('p=p');
    expect(detail).toContain('q=q');
    expect(detail).toContain(String.raw`\Delta=`);
    expect(detail).toContain(String.raw`R=-\frac{q}{2}+\sqrt{`);
  });

  it('uses the p=0 branch form without Cardano denominator facts', () => {
    const result = expectSuccess('x^3+q=0', 'x');
    const branches = result.branchReadback?.branchesLatex.join(' ') ?? '';

    expect(branches).toContain(String.raw`\operatorname{PrincipalRoot}_{3}`);
    expect(branches).toContain('-q');
    expect(branches).toContain(String.raw`\omega_{0}`);
    expect(branches).not.toContain(String.raw`U_{0}`);
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

describe('solveParameterizedRealCubicCardanoEquation', () => {
  it('returns compact symbolic Real Cardano cases without Complex principal-root notation', () => {
    const result = expectRealSuccess('a*x^3+b*x^2+c*x+d=0', 'x');
    const definitions = result.detailSections.find((section) => section.title === 'Real Cardano Definitions');
    const cases = result.detailSections.find((section) => section.title === 'Real Cardano Cases');
    const serialized = JSON.stringify(result);

    expect(result.exactLatex).toContain(String.raw`x\in\begin{cases}`);
    expect(result.exactLatex).toContain(String.raw`\Delta>0`);
    expect(result.exactLatex).toContain(String.raw`\Delta=0,\ p=0,\ q=0`);
    expect(result.exactLatex).toContain(String.raw`\Delta<0,\ p<0`);
    expect(result.exactLatex).toContain(String.raw`\sqrt[3]{-\frac{q}{2}+\sqrt{\Delta}}`);
    expect(result.exactLatex).toContain(String.raw`\arccos`);
    expect(result.branchReadback).toBeUndefined();
    expect(result.exactSupplementLatex).toEqual([String.raw`a\ne0`]);
    expect(definitions?.lines.join(' ')).toContain(String.raw`A=\frac{b}{a}`);
    expect(definitions?.lines.join(' ')).toContain(String.raw`\Delta=`);
    expect(cases?.lineParts?.[0]?.filter((part) => part.kind === 'math').map((part) => part.latex))
      .toEqual([
        String.raw`\left\{-\frac{A}{3}+\sqrt[3]{-\frac{q}{2}+\sqrt{\Delta}}+\sqrt[3]{-\frac{q}{2}-\sqrt{\Delta}}\right\}`,
        String.raw`\Delta>0`,
      ]);
    expect(cases?.lines.join(' ')).toContain('multiplicity');
    expect(serialized).not.toContain(String.raw`\operatorname{PrincipalRoot}`);
    expect(serialized).not.toContain('RootOf');
  });

  it('supports non-x selected targets through the same direct cubic substrate', () => {
    const result = expectRealSuccess('a*z^3+b*z^2+c*z+d=0', 'z');

    expect(result.target).toBe('z');
    expect(result.exactLatex).toContain(String.raw`z\in\begin{cases}`);
    expect(result.parameterNames).toEqual(['a', 'b', 'c', 'd']);
    expect(result.detailSections.find((section) => section.title === 'Real Cardano Definitions')?.lines.join(' '))
      .toContain(String.raw`z=y-\frac{A}{3}`);
    expect(result.detailSections.find((section) => section.title === 'Real Cardano Cases')?.lineParts?.[3]
      ?.filter((part) => part.kind === 'math').map((part) => part.latex))
      .toEqual([
        String.raw`\left\{-\frac{A}{3}+2\sqrt{-\frac{p}{3}}\cos\left(\frac{1}{3}\arccos\left(\frac{3q}{2p}\sqrt{-\frac{3}{p}}\right)-\frac{2\pi k}{3}\right)\mid k=0,1,2\right\}`,
        String.raw`\Delta<0,\ p<0`,
      ]);
  });

  it('specializes exact numeric coefficient cubics to the applicable Real discriminant case', () => {
    const positive = expectRealSuccess('x^3+x+1=0', 'x');
    const positiveDefinitions = positive.detailSections.find((section) => section.title === 'Substituted Real Cardano Values')
      ?.lines.join(' ') ?? '';
    expect(positive.exactLatex).toContain(String.raw`\Delta>0`);
    expect(positive.exactLatex).not.toContain(String.raw`\Delta=0`);
    expect(positive.exactLatex).not.toContain(String.raw`\Delta<0`);
    expect(positive.exactLatex).toContain(String.raw`\sqrt[3]{-\frac{1}{2}+\sqrt{`);
    expect(positive.exactLatex).not.toContain(String.raw`-\frac{A}{3}`);
    expect(positiveDefinitions).toContain('p=1');
    expect(positiveDefinitions).toContain('q=1');

    const repeated = expectRealSuccess('x^3-3*x+2=0', 'x');
    expect(repeated.exactLatex).toContain(String.raw`\Delta=0,\ p\ne0`);
    expect(repeated.exactLatex).not.toContain(String.raw`\Delta>0`);
    expect(repeated.detailSections.find((section) => section.title === 'Real Cardano Cases')?.lines.join(' '))
      .toContain('double');

    const casusIrreducibilis = expectRealSuccess('x^3-3*x+1=0', 'x');
    expect(casusIrreducibilis.exactLatex).toContain(String.raw`\Delta<0,\ p<0`);
    expect(casusIrreducibilis.exactLatex).toContain(String.raw`k=0,1,2`);
    expect(casusIrreducibilis.exactLatex).not.toContain(String.raw`\operatorname{PrincipalRoot}`);
  });

  it('renders mixed symbolic coefficients as substituted Real Cardano roots instead of generic helpers', () => {
    const result = expectRealSuccess('x^3+p*x+2=0', 'x');
    const definitions = result.detailSections.find((section) => section.title === 'Substituted Real Cardano Values');

    expect(result.exactLatex).toContain('p');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).not.toContain(String.raw`-\frac{A}{3}`);
    expect(result.exactLatex).not.toContain(String.raw`\frac{b}{a}`);
    expect(definitions?.lines.join(' ')).toContain('p=p');
    expect(definitions?.lines.join(' ')).toContain('q=2');
  });

  it('keeps Real Cardano unsupported shape reasons aligned with the Complex route', () => {
    expect(expectRealUnsupported('a*x^4+b*x^3+c*x^2+d*x+f=0', 'x')).toMatchObject({
      reason: 'ferrari-deferred',
    });
    expect(expectRealUnsupported('x^5+a=0', 'x')).toMatchObject({
      reason: 'degree-limit',
    });
    expect(expectRealUnsupported('\\frac{1}{x}=a', 'x')).toMatchObject({
      reason: 'target-in-denominator',
    });
    expect(expectRealUnsupported('\\sin\\left(x\\right)=a', 'x')).toMatchObject({
      reason: 'target-in-unsupported-family',
    });
  });
});

describe('solveParameterizedRationalCubicCardanoEquation', () => {
  it('clears top-level rational cubics into the Real Cardano route while preserving exclusions', () => {
    const result = expectRationalCardanoSuccess(
      String.raw`\frac{a*x^3+b*x^2+c*x+d}{x-m}=0`,
      'x',
      { domain: 'real' },
    );

    expect(result.clearedEquationLatex).toContain('x^3');
    expect(result.exactLatex).toContain(String.raw`x\in\begin{cases}`);
    expect(result.exactSupplementLatex).toContain(String.raw`x-m\ne0`);
    expect(result.exactSupplementLatex).toContain(String.raw`a\ne0`);
    expect(result.detailSections.some((section) => section.title === 'Cubic Rational Normalization')).toBe(true);
    expect(JSON.stringify(result)).not.toContain(String.raw`\operatorname{PrincipalRoot}`);
    expect(JSON.stringify(result)).not.toContain('RootOf');
  });

  it('clears top-level rational cubics into the Complex Cardano route while preserving branch metadata', () => {
    const result = expectRationalCardanoSuccess(
      String.raw`\frac{a*x^3+b*x^2+c*x+d}{x-m}=0`,
      'x',
      { domain: 'complex', complexExactForm: 'cis' },
    );

    expect(result.branchReadback?.source).toBe('equation-cubic-cardano');
    expect(result.branchReadback?.branchesLatex).toHaveLength(3);
    expect(result.exactSupplementLatex).toContain(String.raw`x-m\ne0`);
    expect(result.exactSupplementLatex).toContain(String.raw`a\ne0`);
    expect(result.exactSupplementLatex).toContain(String.raw`R\ne0`);
    expect(result.detailSections.some((section) => section.title === 'Cardano Definitions')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Cubic Rational Normalization')).toBe(true);
  });

  it('keeps quartic and over-cap cleared rational equations stopped honestly', () => {
    expect(expectRationalCardanoUnsupported(
      String.raw`\frac{a*x^4+b*x^3+c*x^2+d*x+f}{x-m}=0`,
      'x',
      { domain: 'real' },
    )).toMatchObject({ reason: 'ferrari-deferred' });

    expect(expectRationalCardanoUnsupported(
      String.raw`\frac{x^5+a}{x-m}=0`,
      'x',
      { domain: 'real' },
    )).toMatchObject({ reason: 'degree-limit' });
  });
});
