import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { buildBranchReadback } from '../complex/branches';
import {
  solveBoundedComplexPolynomialCarrierEquationAst,
  solveBoundedPolynomialCarrierEquationAst,
} from '../polynomial-carrier-follow-on';

const ce = new ComputeEngine();

describe('solveBoundedPolynomialCarrierEquationAst', () => {
  it('solves bounded quadratic-carrier follow-ons exactly', () => {
    const result = solveBoundedPolynomialCarrierEquationAst(
      ce.parse('(x^2+x)^2-(x^2+x)-1=0').json,
    );

    expect(result.kind).toBe('solved');
    if (result.kind !== 'solved') {
      throw new Error('Expected a solved polynomial-carrier follow-on');
    }

    expect(result.roots).toHaveLength(2);
    expect(result.roots[0].numeric).toBeCloseTo(-1.8667603992, 6);
    expect(result.roots[1].numeric).toBeCloseTo(0.8667603992, 6);
    expect(result.roots[0].latex).toMatch(/(\\sqrt\{5\}|5\^\{1\/2\})/);
  });

  it('returns empty when recognized carrier roots have no real back-solution', () => {
    const result = solveBoundedPolynomialCarrierEquationAst(
      ce.parse('(x^2+x)^2+3(x^2+x)+2=0').json,
    );

    expect(result.kind).toBe('empty');
  });

  it('ignores broader nonlinear carriers outside the POLY-RAD2 surface', () => {
    const result = solveBoundedPolynomialCarrierEquationAst(
      ce.parse('(x^3+x)^2-5(x^3+x)+4=1').json,
    );

    expect(result.kind).toBe('none');
  });

  it('renders complex carrier follow-on branches through node-backed readback', () => {
    const result = solveBoundedComplexPolynomialCarrierEquationAst(
      ce.parse('(x^2+x)^2-(x^2+x)-1=0').json,
    );

    expect(result.kind).toBe('solved');
    if (result.kind !== 'solved') {
      throw new Error('Expected a solved complex polynomial-carrier follow-on');
    }

    const readback = buildBranchReadback('x', result.branches, 'exact', 'rectangular');

    expect(readback.exactLatex).not.toContain('1+-4');
    expect(readback.exactLatex).not.toContain(String.raw`1+\left(-4`);
    expect(readback.exactLatex).not.toContain('ii');
    expect(readback.exactLatex).not.toContain('+-');
    expect(readback.exactLatex).not.toContain(String.raw`+\frac{-`);
    expect(readback.exactLatex).not.toContain(String.raw`+\left(-\frac`);
    expect(readback.exactLatex).not.toContain('0.5');
  });
});
