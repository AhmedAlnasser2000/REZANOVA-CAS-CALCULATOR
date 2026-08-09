import { describe, expect, it } from 'vitest';
import {
  runEquationMode,
} from '../equation';
import { makeRequest } from './test-support';

describe('Equation mode answer modes', () => {
  it('uses Numeric Interval Solve as an explicit numeric route', () => {
    const missingInterval = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+1=0',
      equationSolveTarget: 'x',
      equationAnswerMode: 'approximate',
    });

    expect(missingInterval.kind).toBe('error');
    if (missingInterval.kind !== 'error') {
      throw new Error('Expected numeric interval guidance');
    }
    expect(missingInterval.answerMode).toBeUndefined();
    expect(missingInterval.error).toContain('numeric interval');

    const numeric = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+1=0',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
      numericInterval: { start: '-2', end: '2', subdivisions: 64 },
    });

    expect(numeric.kind).toBe('success');
    if (numeric.kind !== 'success') {
      throw new Error('Expected numeric interval success');
    }
    expect(numeric.answerMode).toBeUndefined();
    expect(numeric.solutionKind).toBe('approximate-numeric');
    expect(numeric.solveBadges).toContain('Numeric Interval');
    expect(numeric.approxText ?? numeric.exactLatex ?? '').toContain('x');
  });

  it('keeps Numeric Interval Solve numeric-only after stored-value substitution', () => {
    const symbolicParameters = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'b^{45}=nvm^3',
      equationSolveTarget: 'm',
      equationAnswerMode: 'exact',
      numericInterval: { start: '0', end: '10', subdivisions: 64 },
    });
    const substitutedNumeric = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a+x=5',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
      numericInterval: { start: '0', end: '5', subdivisions: 64 },
      storedVariables: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
    });
    const protectedTarget = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a+x=5',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
      numericInterval: { start: '0', end: '5', subdivisions: 64 },
      storedVariables: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
        { name: 'x', valueLatex: '100', numericValue: 100 },
      ],
    });

    expect(symbolicParameters.kind).toBe('error');
    if (symbolicParameters.kind !== 'error') {
      throw new Error('Expected Numeric Interval Solve to stop on symbolic parameters');
    }
    expect(symbolicParameters.answerMode).toBeUndefined();
    expect(symbolicParameters.error).toContain('Missing numeric values: b, n, v');
    expect(symbolicParameters.error).not.toContain('values: b, m');
    expect(symbolicParameters.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Store a numeric value for b in Variables.');
    expect(symbolicParameters.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Then run Numeric Interval Solve again with Run / F1 / EXE.');

    expect(substitutedNumeric.kind).toBe('success');
    expect(protectedTarget.kind).toBe('success');
    if (substitutedNumeric.kind !== 'success' || protectedTarget.kind !== 'success') {
      throw new Error('Expected numeric interval successes');
    }
    expect(substitutedNumeric.solutionKind).toBe('approximate-numeric');
    expect(protectedTarget.solutionKind).toBe('approximate-numeric');
    expect(substitutedNumeric.approxText).toContain('x ~= 3');
    expect(protectedTarget.approxText).toContain('x ~= 3');
    expect(protectedTarget.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Kept x symbolic as the solve target');
  });

  it('keeps exact symbolic parameters exact and asks for missing values only on numeric routes', () => {
    const exact = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{2}x=a',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
    });
    const numericWithoutA = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{2}x=a',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
      numericInterval: { start: '-10', end: '10', subdivisions: 64 },
    });
    const numericWithA = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{2}x=a',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
      numericInterval: { start: '-10', end: '10', subdivisions: 64 },
      storedVariables: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
    });

    expect(exact.kind).toBe('success');
    if (exact.kind !== 'success') {
      throw new Error('Expected exact symbolic success');
    }
    expect(exact.answerMode).toBe('exact');
    expect(exact.exactLatex).toContain('a');
    expect(exact.exactLatex).toContain('\\sqrt{2}');

    expect(numericWithoutA.kind).toBe('error');
    if (numericWithoutA.kind !== 'error') {
      throw new Error('Expected missing-value guidance');
    }
    expect(numericWithoutA.answerMode).toBeUndefined();
    expect(numericWithoutA.error).toContain('Missing numeric value: a');
    expect(numericWithoutA.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Store a numeric value for a in Variables.');

    expect(numericWithA.kind).toBe('success');
    if (numericWithA.kind !== 'success') {
      throw new Error('Expected numeric route success');
    }
    expect(numericWithA.answerMode).toBeUndefined();
    expect(numericWithA.solutionKind).toBe('approximate-numeric');
    expect(numericWithA.approxText).toContain('x ~= 1.414');
  });

  it('uses Isolate answer mode for compact selected-target rearrangement', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'b^2+c^4v^3=uy\\sqrt{k}',
      equationSolveTarget: 'v',
      equationAnswerMode: 'isolate',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected isolate success');
    }
    expect(result.answerMode).toBe('isolate');
    expect(result.exactLatex).toContain('v=\\sqrt[3]');
    expect(result.exactSupplementLatex?.join(' ')).toContain('c^4\\ne0');
    expect(result.detailSections?.some((section) => section.title === 'Target Isolation')).toBe(true);
    expect(result.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(false);
  });

  it('uses Isolate answer mode as textbook formula rearrangement for selected-target powers', () => {
    const square = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^2=a',
      equationSolveTarget: 'u',
      equationAnswerMode: 'isolate',
    });
    const cube = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^3=a',
      equationSolveTarget: 'u',
      equationAnswerMode: 'isolate',
    });
    const screenshot = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{b}{\\sqrt{a+c+v+x}}=u^2',
      equationSolveTarget: 'u',
      equationAnswerMode: 'isolate',
    });
    const denominatorTarget = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{b}{\\sqrt{a+c+v+x}}=u^2',
      equationSolveTarget: 'x',
      equationAnswerMode: 'isolate',
    });

    expect(square.kind).toBe('success');
    expect(cube.kind).toBe('success');
    expect(screenshot.kind).toBe('success');
    expect(denominatorTarget.kind).toBe('error');

    if (square.kind !== 'success' || cube.kind !== 'success' || screenshot.kind !== 'success') {
      throw new Error('Expected isolate power formulas');
    }
    if (denominatorTarget.kind !== 'error') {
      throw new Error('Expected target-containing denominator to remain deferred');
    }

    expect(square.exactLatex).toBe('u=\\pm \\sqrt{a}');
    expect(square.exactSupplementLatex?.join(' ')).toContain('a\\ge0');
    expect(square.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Formula branches: u=-\\sqrt{a}, u=\\sqrt{a}');
    expect(cube.exactLatex).toBe('u=\\sqrt[3]{a}');
    expect(screenshot.exactLatex).toContain('u=\\pm');
    expect(screenshot.exactLatex).toContain('\\sqrt{\\frac{b}{\\sqrt{a+c+v+x}}}');
    expect(denominatorTarget.error).toContain('denominator');
  });

  it('prefers real algebraic power isolation before exp/log in Exact mode', () => {
    const cube = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^3=a',
      equationSolveTarget: 'u',
      equationAnswerMode: 'exact',
    });
    const quartic = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^4=a',
      equationSolveTarget: 'u',
      equationAnswerMode: 'exact',
    });

    expect(cube.kind).toBe('success');
    expect(quartic.kind).toBe('success');
    if (cube.kind !== 'success' || quartic.kind !== 'success') {
      throw new Error('Expected exact power successes');
    }

    expect(cube.exactLatex).toBe('u=\\sqrt[3]{a}');
    expect(cube.exactSupplementLatex ?? []).not.toContain('a>0');
    expect(cube.exactSupplementLatex ?? []).not.toContain('u>0');
    expect(cube.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
    expect(quartic.exactLatex).toContain('u\\in');
    expect(quartic.exactLatex).toContain('-\\sqrt[4]{a}');
    expect(quartic.exactLatex).toContain('\\sqrt[4]{a}');
    expect(quartic.exactSupplementLatex).toContain('a\\ge0');
    expect(quartic.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
  });

  it('uses the bounded polynomial-carrier bridge for direct quadratic carriers', () => {
    const carrier = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(x^2+x)^2-(x^2+x)-1=0',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
    });
    const broader = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(x^3+x)^2-5(x^3+x)+4=1',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
    });

    expect(carrier.kind).toBe('success');
    if (carrier.kind !== 'success') {
      throw new Error('Expected polynomial carrier success');
    }
    expect(carrier.exactLatex).toContain('x\\in');
    expect(carrier.exactLatex).toMatch(/\\sqrt\{5\}|5\^\{1\/2\}/);

    expect(broader.kind).toBe('success');
    if (broader.kind !== 'success') {
      throw new Error('Expected broader nonlinear carrier to use numeric fallback');
    }
    expect(broader.solutionKind).toBe('approximate-numeric');
    expect(broader.resultOrigin).toBe('numeric-fallback');
    expect(broader.answerMode).toBeUndefined();
    expect(broader.exactLatex).toContain('x\\approx');
  });

  it('shows mode-specific guidance for Isolate and legacy Approx inequality inputs', () => {
    const approximate = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3\\le7',
      equationAnswerMode: 'approximate',
    });
    const isolate = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3\\le7',
      equationAnswerMode: 'isolate',
    });

    expect(approximate.kind).toBe('error');
    expect(isolate.kind).toBe('error');
    if (approximate.kind !== 'error' || isolate.kind !== 'error') {
      throw new Error('Expected answer-mode inequality guidance');
    }

    expect(approximate.error).toContain('Approximate answer mode does not solve inequalities');
    expect(isolate.error).toContain('Isolate answer mode does not solve inequalities');
    expect(approximate.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Use Exact mode');
    expect(isolate.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Use Exact mode');
  });

  it('allows Exact mode to surface a supported bounded result for formerly numeric-only log families', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\log(x^2+9x-5)=\\log(8x+\\ln 4)',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Exact mode to surface numeric fallback evidence');
    }
    expect(result.answerMode).toBe('exact');
    expect(result.exactLatex ?? result.approxText ?? '').toContain('x');
    expect((result.detailSections?.length ?? 0) > 0).toBe(true);
    expect(JSON.stringify(result)).not.toContain('candidate-validated');
  });
});
