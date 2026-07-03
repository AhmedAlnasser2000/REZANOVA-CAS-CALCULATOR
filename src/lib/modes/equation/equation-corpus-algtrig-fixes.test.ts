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
    throw new Error(`Expected success for ${equationLatex}, received ${result.error}`);
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
});
