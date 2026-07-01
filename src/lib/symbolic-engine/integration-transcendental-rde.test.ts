import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  buildLiouvilleRationalCertificateRde,
  solveTranscendentalRde,
  solveTranscendentalRdeEquation,
} from './integration/transcendental-rde';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

describe('transcendental Risch RDE proof core', () => {
  it('solves constant-coefficient proof RDEs exactly with pivot facts', () => {
    const result = solveTranscendentalRde({
      coefficientNode: node('a'),
      rhsNode: node('1'),
    });

    expect(result.kind).toBe('solution');
    if (result.kind !== 'solution') {
      throw new Error('expected constant-coefficient RDE solution');
    }

    expect(result.proofMode).toBe('exact-symbolic-no-compute-engine');
    expect(result.proofSummary).toContain('exact polynomial recurrence');
    expect(compact(result.solutionLatex)).toContain('\\frac{1}{a}');
    expect(result.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
  });

  it('integrates zero-coefficient polynomial RDEs by exact coefficient division', () => {
    const result = solveTranscendentalRde({
      coefficientNode: node('0'),
      rhsNode: node('x^2'),
    });

    expect(result.kind).toBe('solution');
    if (result.kind !== 'solution') {
      throw new Error('expected polynomial integration RDE solution');
    }

    expect(compact(result.solutionLatex)).toContain('\\frac{x^3}{3}');
    expect(result.proofSteps.join(' ')).toContain('No numeric or Compute Engine');
  });

  it('solves polynomial-coefficient RDEs by bounded coefficient comparison', () => {
    const result = solveTranscendentalRde({
      coefficientNode: node('x'),
      rhsNode: node('x^2+1'),
    });

    expect(result.kind).toBe('solution');
    if (result.kind !== 'solution') {
      throw new Error('expected coefficient-comparison RDE solution');
    }

    expect(result.proofSummary).toContain('coefficient comparison');
    expect(compact(result.solutionLatex)).toBe('x');
    expect(result.proofSteps.join(' ')).toContain('Verified every coefficient equation exactly');

    const symbolic = solveTranscendentalRde({
      coefficientNode: node('a*x'),
      rhsNode: node('a*x^2+1'),
    });

    expect(symbolic.kind).toBe('solution');
    if (symbolic.kind !== 'solution') {
      throw new Error('expected symbolic coefficient-comparison RDE solution');
    }

    expect(compact(symbolic.solutionLatex)).toBe('x');
    expect(symbolic.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
  });

  it('keeps selected-variable and cap policy in parametric RDE solving', () => {
    const selectedVariable = solveTranscendentalRde({
      coefficientNode: node('a*t+x'),
      rhsNode: node('a*t^2+x*t+1'),
      variable: 't',
    });

    expect(selectedVariable.kind).toBe('solution');
    if (selectedVariable.kind !== 'solution') {
      throw new Error('expected t-variable coefficient-comparison RDE solution');
    }
    expect(compact(selectedVariable.solutionLatex)).toBe('t');

    const exactCap = solveTranscendentalRde({
      coefficientNode: node('0'),
      rhsNode: node('x^{11}'),
    });
    expect(exactCap.kind).toBe('solution');
    if (exactCap.kind !== 'solution') {
      throw new Error('expected exact-rational cap-12 RDE solution');
    }
    expect(compact(exactCap.solutionLatex)).toContain('\\frac{x^{12}}{12}');

    expect(solveTranscendentalRde({
      coefficientNode: node('a*x^{11}'),
      rhsNode: node('1'),
    })).toMatchObject({
      kind: 'stop',
      reason: 'over-cap-degree',
    });
  });

  it('records polynomial-degree obstruction evidence for nonconstant coefficient certificate equations', () => {
    const result = solveTranscendentalRde({
      coefficientNode: node('2*x'),
      rhsNode: node('1'),
    });

    expect(result.kind).toBe('obstruction');
    if (result.kind !== 'obstruction') {
      throw new Error('expected polynomial-degree obstruction');
    }

    expect(result.obstruction).toBe('no-rational-solution-polynomial-degree');
    expect(result.proofSummary).toContain('no rational solution');
    expect(result.proofSteps.join(' ')).toContain('incompatible polynomial degrees');
    expect(result.exactSupplementLatex).toBeUndefined();
  });

  it('builds Liouville rational-certificate RDEs from symbolic quadratic exponents', () => {
    const built = buildLiouvilleRationalCertificateRde({
      exponentNode: node('a*x^2+b*x+c'),
    });

    expect(built.kind).toBe('success');
    if (built.kind !== 'success') {
      throw new Error('expected Liouville RDE equation');
    }

    expect(built.equation.variable).toBe('x');
    expect(compact(built.equation.coefficientLatex)).toContain('2ax');
    expect(compact(built.equation.coefficientLatex)).toContain('b');
    expect(built.equation.equationLatex).toContain('r(x)');

    const solved = solveTranscendentalRdeEquation(built.equation);
    expect(solved.kind).toBe('obstruction');
    if (solved.kind !== 'obstruction') {
      throw new Error('expected Liouville obstruction');
    }
    expect(solved.exactSupplementLatex?.join(' ')).toContain('2a\\ne0');
  });

  it('keeps arbitrary selected-variable support in RDE proof objects', () => {
    const built = buildLiouvilleRationalCertificateRde({
      exponentNode: node('a*t^2+x*t+b'),
      variable: 't',
    });

    expect(built.kind).toBe('success');
    if (built.kind !== 'success') {
      throw new Error('expected t-variable Liouville RDE equation');
    }

    expect(built.equation.variable).toBe('t');
    expect(compact(built.equation.coefficientLatex)).toContain('2at');
    expect(compact(built.equation.coefficientLatex)).toContain('x');

    const solved = solveTranscendentalRdeEquation(built.equation);
    expect(solved.kind).toBe('obstruction');
  });

  it('stops proof-local RDE work on unsafe coefficients and unsupported shapes', () => {
    expect(solveTranscendentalRde({
      coefficientNode: node('2.5*x'),
      rhsNode: node('1'),
    })).toMatchObject({
      kind: 'stop',
      reason: 'decimal-coefficient',
    });

    expect(solveTranscendentalRde({
      coefficientNode: node('\\sin(a)*x'),
      rhsNode: node('1'),
    })).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-coefficient',
    });

    expect(solveTranscendentalRde({
      coefficientNode: node('x'),
      rhsNode: node('x^2'),
    })).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-nonconstant-rhs',
    });

    expect(solveTranscendentalRde({
      coefficientNode: node('\\left|a\\right|'),
      rhsNode: node('1'),
    })).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive-carrier',
    });
  });
});
