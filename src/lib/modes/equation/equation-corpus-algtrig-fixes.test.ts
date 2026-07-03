import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../equation';
import { collectOutcomeText, makeRequest } from './test-support';

function solve(equationLatex: string) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    angleUnit: 'rad',
  });
}

function expectSuccess(equationLatex: string) {
  const result = solve(equationLatex);
  if (result.kind !== 'success') {
    const received = 'error' in result ? result.error : result.kind;
    throw new Error(`Expected success for ${equationLatex}, received ${received}`);
  }
  return result;
}

describe('Equation OpenStax Algebra/Trig corpus fixes', () => {
  it('keeps factorable fifth-degree textbook roots exact', () => {
    const result = expectSuccess(String.raw`x^5-x=0`);
    const text = collectOutcomeText(result);

    expect(result.solutionKind).not.toBe('approximate-numeric');
    expect(text).not.toContain('No supported exact form was found');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('0');
    expect(result.exactLatex).toContain('1');
  });

  it('preserves cancelled rational-hole exclusions', () => {
    const result = expectSuccess(String.raw`\frac{x^2-4}{x+2}=0`);
    const text = collectOutcomeText(result);

    expect(result.exactLatex).toBe('x=2');
    expect(text).toContain('x+2\\ne0');
  });

  it('solves natural exponential inverse equations exactly', () => {
    const ascii = expectSuccess(String.raw`e^x=5`);
    const canonical = expectSuccess(String.raw`\exponentialE^x=5`);

    expect(ascii.exactLatex).toContain('\\ln(5)');
    expect(canonical.exactLatex).toContain('\\ln(5)');
  });

  it('solves scan2 pasted absolute-value and exp-log equations exactly', () => {
    const pastedAbs = expectSuccess(String.raw`2abs(x-1)+3=11`);
    const fractionalBase = expectSuccess(String.raw`9^x=27`);
    const affineNaturalExp = expectSuccess(String.raw`e^{x-2}=5`);
    const scaledNaturalExp = expectSuccess(String.raw`4e^{-x}=9`);

    expect(pastedAbs.exactLatex).toContain('5');
    expect(pastedAbs.exactLatex).toContain('-3');
    expect(fractionalBase.exactLatex).toBe('x=\\frac{3}{2}');
    expect(affineNaturalExp.exactLatex).toBe('x=2+\\ln(5)');
    expect(scaledNaturalExp.exactLatex).toBe('x=-\\ln(\\frac{9}{4})');
  });

  it('returns periodic families for quadratic trig carriers', () => {
    const result = expectSuccess(String.raw`2\cos^2(x)-1=0`);
    const text = collectOutcomeText(result);

    expect(text).toContain('n\\in\\mathbb{Z}');
    expect(text).toContain('\\frac{\\pi}{4}');
    expect(text).toContain('\\pi n');
  });

  it('simplifies inverse trig special angles in periodic readback', () => {
    const directSine = expectSuccess(String.raw`\sin(x)=\frac{1}{2}`);
    const affineSine = expectSuccess(String.raw`2\sin(x)-1=0`);
    const tangent = expectSuccess(String.raw`\tan(x)=1`);

    for (const result of [directSine, affineSine]) {
      const text = collectOutcomeText(result);
      expect(text).toContain('\\frac{\\pi}{6}');
      expect(text).toContain('\\frac{5\\pi}{6}');
      expect(text).not.toContain('\\arcsin(\\frac{1}{2})');
    }

    expect(collectOutcomeText(tangent)).toContain('\\frac{\\pi}{4}');
    expect(collectOutcomeText(tangent)).not.toContain('\\arctan(1)');
  });

  it('keeps scan2 trig rewrites periodic in exact mode', () => {
    const square = expectSuccess(String.raw`\sin(x)^2=\frac{1}{4}`);
    const identity = expectSuccess(String.raw`\sin(x)=\cos(x)`);
    const productUnit = expectSuccess(String.raw`2\sin(x)\cos(x)=1`);
    const productZero = expectSuccess(String.raw`\sin(x)\cos(x)=0`);
    const squareDifference = expectSuccess(String.raw`\sin(x)^2-\cos(x)^2=0`);
    const affineAngle = expectSuccess(String.raw`\cos\left(\frac{x}{2}\right)=0`);

    for (const result of [square, identity, productUnit, productZero, squareDifference, affineAngle]) {
      expect(collectOutcomeText(result)).toContain('n\\in\\mathbb{Z}');
    }
    expect(identity.exactLatex).toBe('x\\in\\left\\{\\frac{\\pi}{4}+\\pi n\\right\\}');
    expect(productUnit.exactLatex).toBe('x\\in\\left\\{\\frac{\\pi}{4}+\\pi n\\right\\}');
    expect(productZero.exactLatex).toBe('x\\in\\left\\{\\frac{\\pi n}{2}\\right\\}');
    expect(squareDifference.exactLatex).toBe('x\\in\\left\\{\\frac{\\pi}{4}+\\frac{\\pi n}{2}\\right\\}');
    expect(affineAngle.exactLatex).toBe('x\\in\\left\\{\\pi+2\\pi n\\right\\}');
  });
});
