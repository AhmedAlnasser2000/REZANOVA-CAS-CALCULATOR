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

function solveComplex(equationLatex: string) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'complex',
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
    const doubledCosZero = expectSuccess(String.raw`\cos(2x)=0`);
    const doubledTanUnit = expectSuccess(String.raw`\tan(2x)=1`);

    for (const result of [square, identity, productUnit, productZero, squareDifference, affineAngle, doubledCosZero, doubledTanUnit]) {
      expect(collectOutcomeText(result)).toContain('n\\in\\mathbb{Z}');
      expect(result.exactLatex).not.toContain('\\frac{\\frac');
    }
    expect(identity.exactLatex).toBe('x\\in\\left\\{\\frac{\\pi}{4}+\\pi n\\right\\}');
    expect(productUnit.exactLatex).toBe('x\\in\\left\\{\\frac{\\pi}{4}+\\pi n\\right\\}');
    expect(productZero.exactLatex).toBe('x\\in\\left\\{\\frac{\\pi n}{2}\\right\\}');
    expect(squareDifference.exactLatex).toBe('x\\in\\left\\{\\frac{\\pi}{4}+\\frac{\\pi n}{2}\\right\\}');
    expect(affineAngle.exactLatex).toBe('x=\\pi+2\\pi n');
    expect(doubledCosZero.exactLatex).toBe('x=\\frac{\\pi}{4}+\\frac{\\pi n}{2}');
    expect(doubledTanUnit.exactLatex).toBe('x=\\frac{\\pi}{8}+\\frac{\\pi n}{2}');
  });

  it('normalizes scan3 special-angle and quadratic trig output without decimals', () => {
    const sineRadical = expectSuccess(String.raw`\sin(x)=\frac{\sqrt{2}}{2}`);
    const tangentRadical = expectSuccess(String.raw`\tan(x)=-\sqrt{3}`);
    const nonSpecialSine = expectSuccess(String.raw`\sin(x)=\frac{1}{3}`);
    const nonSpecialTangent = expectSuccess(String.raw`\tan(x)=\frac{1}{2}`);
    const sineSquare = expectSuccess(String.raw`2\sin^2(x)-1=0`);
    const tangentSquare = expectSuccess(String.raw`\tan^2(x)-3=0`);
    const mixedZero = expectSuccess(String.raw`\sin(x)+\cos(x)=0`);
    const doubleAngleComposition = expectSuccess(String.raw`\sin(2x)=\cos(x)`);

    expect(sineRadical.exactLatex).toContain('\\frac{\\pi}{4}');
    expect(sineRadical.exactLatex).toContain('\\frac{3\\pi}{4}');
    expect(collectOutcomeText(sineRadical)).not.toContain('\\arcsin');
    expect(tangentRadical.exactLatex).toContain('\\frac{2\\pi}{3}');
    expect(collectOutcomeText(tangentRadical)).not.toContain('\\arctan');
    expect(nonSpecialSine.exactLatex).toContain('\\arcsin(\\frac{1}{3})');
    expect(nonSpecialTangent.exactLatex).toContain('\\arctan(\\frac{1}{2})');

    for (const result of [sineSquare, tangentSquare, mixedZero, doubleAngleComposition]) {
      const text = collectOutcomeText(result);
      expect(text).toContain('n\\in\\mathbb{Z}');
      expect(text).not.toMatch(/\d+\.\d/u);
      expect(text).not.toContain('\\arcsin(0)');
      expect(text).not.toContain('\\operatorname{atan2}');
    }
    expect(sineSquare.exactLatex).toContain('\\frac{\\pi}{4}');
    expect(sineSquare.exactLatex).toBe('x=\\frac{\\pi}{4}+\\frac{\\pi n}{2}');
    expect(tangentSquare.exactLatex).toContain('\\frac{\\pi}{3}');
    expect(mixedZero.exactLatex).toContain('\\frac{3\\pi}{4}');
    expect(doubleAngleComposition.exactLatex).toContain('\\frac{\\pi}{6}');
  });

  it('renders scan3 exp/log exact forms without decimal leakage', () => {
    const numericBase = expectSuccess(String.raw`2^x=7`);
    const affineNumericBase = expectSuccess(String.raw`3^{2x}=11`);
    const fractionalBase = expectSuccess(String.raw`9^x=27`);
    const quadraticExponent = expectSuccess(String.raw`e^{x^2}=5`);
    const nestedLog = expectSuccess(String.raw`\ln(e^x+1)=2`);

    expect(numericBase.exactLatex).toBe('x=\\frac{\\ln(7)}{\\ln(2)}');
    expect(numericBase.approxText).toContain('x ~= 2.807355');
    expect(affineNumericBase.exactLatex).toBe('x=\\frac{\\ln(11)}{2\\ln(3)}');
    expect(affineNumericBase.approxText).toContain('x ~= 1.091329');
    expect(fractionalBase.exactLatex).toBe('x=\\frac{3}{2}');
    expect(fractionalBase.approxText).toContain('x ~= 1.5');
    expect(quadraticExponent.exactLatex).toContain('-\\sqrt{\\ln(5)}');
    expect(quadraticExponent.exactLatex).toContain('\\sqrt{\\ln(5)}');
    expect(quadraticExponent.approxText).toContain('-1.268636');
    expect(quadraticExponent.approxText).toContain('1.268636');
    expect(collectOutcomeText(quadraticExponent)).not.toMatch(/\d+\.\d/u);
    expect(nestedLog.exactLatex).toBe('x=\\ln(e^{2}-1)');
    expect(nestedLog.approxText).toContain('x ~= 1.854587');
    expect(collectOutcomeText(nestedLog)).toContain('e^{x}+1>0');
  });

  it('does not let Complex On wrapper boundaries mask real periodic textbook answers', () => {
    const sineSquare = solveComplex(String.raw`2\sin^2(x)-1=0`);
    const tangentSquare = solveComplex(String.raw`\tan^2(x)-3=0`);

    for (const result of [sineSquare, tangentSquare]) {
      expect(result.kind).toBe('success');
      if (result.kind !== 'success') {
        throw new Error(`Expected Complex On fallback success, received ${'error' in result ? result.error : result.kind}`);
      }
      const text = collectOutcomeText(result);
      expect(text).toContain('n\\in\\mathbb{Z}');
      expect(result.detailSections?.map((section) => section.title)).toContain('Complex Extension Boundary');
      expect(text).toContain('validated real solution family');
    }
    expect(sineSquare.kind === 'success' ? sineSquare.exactLatex : '').toContain('\\frac{\\pi}{4}');
    expect(tangentSquare.kind === 'success' ? tangentSquare.exactLatex : '').toContain('\\frac{\\pi}{3}');
  });

  it('preserves scan3 formula constraints and radical candidate evidence', () => {
    const formulaSquare = expectSuccess(String.raw`E=\frac{1}{2}kx^2`);
    const inverseFormula = expectSuccess(String.raw`y=\frac{2x+3}{x-4}`);
    const extraneousRadical = expectSuccess(String.raw`\sqrt{x+10}=x+2`);
    const twoRadicals = expectSuccess(String.raw`\sqrt{2x+1}+\sqrt{x-3}=6`);

    expect(collectOutcomeText(formulaSquare)).toContain('k\\ne0');
    expect(collectOutcomeText(inverseFormula)).toContain('y\\ne2');

    for (const result of [extraneousRadical, twoRadicals]) {
      const text = collectOutcomeText(result);
      expect(text).toContain('Candidate');
      expect(text).toContain('rejected');
      expect(text).not.toContain('(approximately');
    }
  });

  it('uses concrete scan3 nested composition benchmarks instead of abstract placeholders', () => {
    const radicalComposition = expectSuccess(String.raw`\sqrt{x^2+3x+2}=0`);
    const logComposition = expectSuccess(String.raw`\ln(x^2+3x+3)=0`);

    expect(radicalComposition.exactLatex).toContain('-2');
    expect(radicalComposition.exactLatex).toContain('-1');
    expect(logComposition.exactLatex).toContain('-2');
    expect(logComposition.exactLatex).toContain('-1');
    expect(collectOutcomeText(logComposition)).toContain('x^2+3x+3>0');
  });
});
