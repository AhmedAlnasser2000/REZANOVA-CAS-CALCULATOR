import { describe, expect, it } from 'vitest';
import {
  runEquationMode,
} from '../equation';
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
