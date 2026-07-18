import { describe, expect, it } from 'vitest';
import {
  runEquationMode,
} from '../equation';
import { finalizeEquationCanonicalRuntimeOutcome } from '../../equation/solve-result';
import { makeRequest } from './test-support';

describe('Equation mode systems and guided polynomial', () => {
  it('solves linear 2x2 systems', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'linear2',
      equationLatex: '',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=1');
    expect(result.exactLatex).toContain('y=2');
    const finalized = finalizeEquationCanonicalRuntimeOutcome(result);
    if (finalized.kind === 'prompt') throw new Error('Expected a finalized system result');
    expect(finalized.canonicalResult.version).toBe(2);
  });

  it('routes scan3 textbook 2x2 systems through the existing linear screen', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'linear2',
      equationLatex: '',
      system2: [
        [1, 1, 7],
        [1, -1, 1],
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=4');
    expect(result.exactLatex).toContain('y=3');
  });

  it('routes scan3 textbook 3x3 systems through the existing linear screen', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'linear3',
      equationLatex: '',
      system3: [
        [1, 1, 1, 6],
        [2, -1, 1, 3],
        [1, 2, -1, 2],
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=1');
    expect(result.exactLatex).toContain('y=2');
    expect(result.exactLatex).toContain('z=3');
  });

  it('renders an inconsistent 2x2 system as an empty answer with rank evidence', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'linear2',
      system2: [
        [3, 5, 9],
        [30, 50, -90],
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('Expected a success outcome');
    expect(result.exactLatex).toBe('\\varnothing');
    expect(result.answerRows?.rows).toEqual([{ latex: '\\varnothing', label: 'No solution' }]);
    expect(result.detailSections?.map((section) => section.title)).toContain('System Evidence');
    const finalized = finalizeEquationCanonicalRuntimeOutcome(result);
    if (finalized.kind === 'prompt') throw new Error('Expected a finalized system result');
    expect(finalized.canonicalResult.version).toBe(2);
  });

  it('renders a dependent 2x2 system as a parameter family', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'linear2',
      system2: [
        [1, 1, 2],
        [2, 2, 4],
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('Expected a success outcome');
    expect(result.exactLatex).toContain('x=2-t');
    expect(result.exactLatex).toContain('y=t');
    expect(result.exactSupplementLatex).toContain('t\\in\\mathbb{R}');
    const finalized = finalizeEquationCanonicalRuntimeOutcome(result);
    if (finalized.kind === 'prompt') throw new Error('Expected a finalized system result');
    expect(finalized.canonicalResult.version).toBe(2);
  });

  it('solves a bounded affine-parameter 2x2 system under a determinant condition', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'linear2',
      system2: [
        ['a', '1', '3'],
        ['1', 'b', '4'],
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('Expected a success outcome');
    expect(result.exactLatex).toContain('x=');
    expect(result.exactLatex).toContain('y=');
    expect(result.exactSupplementLatex?.[0]).toContain('ab-1\\ne0');
    expect(result.systemReadback?.source).toBe('equation-linear-2x2-symbolic');
    const finalized = finalizeEquationCanonicalRuntimeOutcome(result);
    if (finalized.kind === 'prompt') throw new Error('Expected a finalized system result');
    expect(finalized.canonicalResult.version).toBe(2);
  });

  it('cancels common symbolic determinant factors in bounded 3x3 Cramer answers', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'linear3',
      system3: [
        ['a', '0', '0', '2'],
        ['0', '1', '0', '3'],
        ['0', '0', '1', '4'],
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('Expected a success outcome');
    expect(result.exactLatex).toContain('x=\\frac{2}{a}');
    expect(result.exactLatex).toContain('y=3');
    expect(result.exactLatex).toContain('z=4');
    expect(result.exactSupplementLatex).toContain('a\\ne0');
  });

  it('stops symbolic systems with an identically zero determinant at the case-splitting boundary', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'linear3',
      system3: [
        ['a', '0', '0', '1'],
        ['2a', '0', '0', '2'],
        ['0', '0', '0', '0'],
      ],
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') throw new Error('Expected a controlled stop');
    expect(result.error).toContain('case-splitting');
  });

  it('solves polynomial 2x2 systems through bounded resultant projection', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'polynomialSystem2',
      equationLatex: '',
      polynomialSystem2Latex: ['y=x^2', 'y=1'],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\left(-1,1\\right)');
    expect(result.exactLatex).toContain('\\left(1,1\\right)');
    expect(result.systemReadback).toMatchObject({
      label: 'Solution pairs',
      variablesLatex: ['x', 'y'],
      rows: [
        { valuesLatex: ['-1', '1'] },
        { valuesLatex: ['1', '1'] },
      ],
    });
    expect(result.detailSections?.map((section) => section.title)).toContain('Resultant Projection');
  });

  it('routes scan3 textbook nonlinear 2x2 systems through the existing polynomial system screen', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'polynomialSystem2',
      equationLatex: '',
      polynomialSystem2Latex: ['x^2+y=10', 'x-y=2'],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\left(-4,-6\\right)');
    expect(result.exactLatex).toContain('\\left(3,1\\right)');
    expect(result.systemReadback?.rows.map((row) => row.valuesLatex)).toEqual([
      ['-4', '-6'],
      ['3', '1'],
    ]);
  });

  it('solves frontier polynomial 2x2 retained projections through the product route', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'polynomialSystem2',
      equationLatex: '',
      polynomialSystem2Latex: [
        'y=(x^2-1)*(x^2-4)*(x^2-9)*(x^2-16)*(x^2-25)*(x^2-36)',
        'y=0',
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\left(-6,0\\right)');
    expect(result.exactLatex).toContain('\\left(6,0\\right)');
    expect(result.detailSections?.map((section) => section.title)).toContain('Candidate Check');
  });

  it('returns a local polynomial-system error for partial input', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'polynomialSystem2',
      equationLatex: '',
      polynomialSystem2Latex: ['', 'x-y=0'],
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('Enter both polynomial equations');
  });

  it('uses symbolic results for guided quadratic equations when available', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).toContain('3');
  });

  it('falls back numerically for guided quadratic complex roots', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
      quadraticCoefficients: [1, 2, 2],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.exactLatex).toContain('\\approx');
    expect(result.exactLatex).toContain('i');
    expect(result.approxText).toContain('-1 - i');
    expect(result.approxText).toContain('-1 + i');
    expect(result.warnings).toContain('Symbolic solve unavailable; showing numeric roots.');
    expect(result.answerDomain).toBeUndefined();
  });

  it('marks guided polynomial complex-capable outputs when Complex is enabled', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
      quadraticCoefficients: [1, 2, 2],
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.answerDomain).toBe('complex');
  });

  it('solves cubic coefficient entry symbolically', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'cubic',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).toContain('3');
  });

  it('solves quartic coefficient entry symbolically through the bounded factor-first path', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quartic',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('-2');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toContain('2');
  });

  it('falls back numerically for guided quartic complex roots', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quartic',
      quarticCoefficients: [5, -6, 5, 4, 1],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.exactLatex).toContain('\\approx');
    expect(result.exactLatex).toContain('i');
    expect(result.approxText).toContain('0.870267 - 1.036465i');
    expect(result.approxText).toContain('-0.270267 + 0.190128i');
    expect(result.answerDomain).toBeUndefined();
  });

  it('rejects a zero leading quadratic coefficient', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
      quadraticCoefficients: [0, 2, 1],
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('non-zero');
  });
});
