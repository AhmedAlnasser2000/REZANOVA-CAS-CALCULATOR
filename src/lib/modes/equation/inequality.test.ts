import { describe, expect, it } from 'vitest';
import {
  runEquationMode,
} from '../equation';
import { makeRequest } from './test-support';

describe('Equation mode inequality', () => {
  it('solves bounded one-variable linear inequalities in Exact mode', () => {
    const less = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x<2',
      equationAnswerMode: 'exact',
    });
    const lessEqual = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x\\le2',
      equationAnswerMode: 'exact',
    });
    const greater = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x>2',
      equationAnswerMode: 'exact',
    });
    const greaterEqual = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x\\ge2',
      equationAnswerMode: 'exact',
    });

    for (const result of [less, lessEqual, greater, greaterEqual]) {
      expect(result.kind).toBe('success');
      if (result.kind !== 'success') {
        throw new Error('Expected inequality success');
      }
      expect(result.answerDomain).toBe('conditional-real');
      expect(result.solutionKind).toBe('inequality-solution-set');
      expect(result.answerMode).toBe('exact');
      expect(result.exactSupplementLatex?.join(' ')).toContain('Ordered inequalities are solved over the real line.');
    }

    expect(less.kind === 'success' ? less.exactLatex : '').toBe('x<2');
    expect(lessEqual.kind === 'success' ? lessEqual.exactLatex : '').toBe('x\\le2');
    expect(greater.kind === 'success' ? greater.exactLatex : '').toBe('x>2');
    expect(greaterEqual.kind === 'success' ? greaterEqual.exactLatex : '').toBe('x\\ge2');
  });

  it('solves affine linear inequalities and flips direction for negative coefficients', () => {
    const positive = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3\\le7',
      equationAnswerMode: 'exact',
    });
    const negative = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '-2x+3<7',
      equationAnswerMode: 'exact',
    });

    expect(positive.kind).toBe('success');
    expect(negative.kind).toBe('success');
    if (positive.kind !== 'success' || negative.kind !== 'success') {
      throw new Error('Expected affine inequality successes');
    }

    expect(positive.exactLatex).toBe('x\\le2');
    expect(negative.exactLatex).toBe('x>-2');
  });

  it('returns all-real and empty-set results for constant linear inequality reductions', () => {
    const allReal = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3<2x+5',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
    });
    const empty = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3>2x+5',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
    });

    expect(allReal.kind).toBe('success');
    expect(empty.kind).toBe('success');
    if (allReal.kind !== 'success' || empty.kind !== 'success') {
      throw new Error('Expected constant inequality reductions');
    }

    expect(allReal.exactLatex).toBe('x\\in\\mathbb{R}');
    expect(empty.exactLatex).toBe('x\\in\\varnothing');
  });

  it('solves bounded rational inequalities while keeping unsupported families controlled', () => {
    const rational = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{x}<1',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
    });
    const symbolicParameter = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a x+b<3',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
    });
    const notEqual = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x\\ne2',
      equationAnswerMode: 'exact',
    });

    expect(rational.kind).toBe('success');
    if (rational.kind !== 'success') {
      throw new Error('Expected rational inequality support');
    }
    expect(rational.exactLatex).toBe('x<0\\;\\cup\\;x>1');
    expect(rational.exactSupplementLatex).toContain('x\\ne0');

    for (const result of [symbolicParameter]) {
      expect(result.kind).toBe('error');
      if (result.kind !== 'error') {
        throw new Error('Expected unsupported inequality guidance');
      }
      expect(result.error).toContain('outside the supported guarded real inequality families');
      expect(result.detailSections?.flatMap((section) => section.lines).join(' ')).toContain(
        'finite composition through 4 layers, direct affine trig, and representable two-layer trig cases',
      );
    }

    expect(notEqual.kind).toBe('error');
    if (notEqual.kind !== 'error') {
      throw new Error('Expected not-equal to remain unsupported');
    }
    expect(notEqual.error).toContain('only = equations');
    expect(notEqual.runtimeAdvisories?.stopReason).toEqual({
      kind: 'invalid-request',
      source: 'host',
    });
    expect(notEqual.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'blocked',
      reason: 'invalid-request',
    });
  });
});
