import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

describe('Equation frontier special-form roots', () => {
  it('routes affine carrier quadratics through special-form roots', () => {
    const shifted = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(x+a)^6-5(x+a)^3+4=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });
    const scaled = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(2x-1)^{12}-5(2x-1)^6+4=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(shifted.kind).toBe('success');
    expect(scaled.kind).toBe('success');
    if (shifted.kind !== 'success' || scaled.kind !== 'success') {
      throw new Error('Expected affine carrier special-form successes');
    }
    expect(shifted.exactLatex).toMatch(/\\sqrt\[3\]\{4\}-a|-a\+\\sqrt\[3\]\{4\}/);
    expect(shifted.exactLatex).toMatch(/1-a|-a\+1/);
    expect(shifted.detailSections?.some((section) => section.title === 'Special-Form Root Solve')).toBe(true);
    expect(scaled.branchReadback?.branchesLatex.length).toBe(4);
    expect(scaled.exactLatex).toContain('\\frac');
    expect(scaled.exactLatex).toMatch(/\\sqrt\[6\]\{4\}|4\^\{1\/6\}/);
  });

  it('keeps direct affine powers on the algebraic isolation route', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(x+a)^{12}=b',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected affine power isolation success');
    }
    expect(result.exactLatex).toContain('\\sqrt[12]{b}-a');
    expect(result.exactSupplementLatex).toEqual(['b\\ge0']);
    expect(result.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
  });

  it('keeps affine carrier degree thirteen outside the frontier', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(x+a)^13=b',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected degree-thirteen affine power to stop');
    }
    expect(result.error).toContain('supported exact families');
  });
});
