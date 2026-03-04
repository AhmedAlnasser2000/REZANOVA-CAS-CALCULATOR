import { describe, expect, it } from 'vitest';
import { runTrigonometryCoreDraft } from './core';

describe('trigonometry core draft runner', () => {
  it('evaluates raw trig functions with the chosen angle unit', () => {
    const { outcome } = runTrigonometryCoreDraft('\\sin\\left(30\\right)', {
      screenHint: 'functions',
      angleUnit: 'deg',
    });
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('\\frac{1}{2}');
    }
  });

  it('evaluates identity simplification through the shared trig core', () => {
    const { outcome } = runTrigonometryCoreDraft(
      '\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)',
      {
        screenHint: 'identitySimplify',
        angleUnit: 'deg',
      },
    );
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('1');
    }
  });

  it('evaluates trig equations and triangle requests through the shared trig core', () => {
    const equation = runTrigonometryCoreDraft('\\sin\\left(x\\right)=\\frac{1}{2}', {
      screenHint: 'equationSolve',
      angleUnit: 'deg',
    });
    expect(equation.outcome.kind).toBe('success');

    const triangle = runTrigonometryCoreDraft('rightTriangle(a=3, b=4)', {
      screenHint: 'rightTriangle',
      angleUnit: 'deg',
    });
    expect(triangle.outcome.kind).toBe('success');
    if (triangle.outcome.kind === 'success') {
      expect(triangle.outcome.exactLatex).toContain('c=5');
    }
  });

  it('evaluates structured angle conversion through the shared trig core', () => {
    const { outcome } = runTrigonometryCoreDraft('angleConvert(value=30, from=deg, to=rad)', {
      screenHint: 'angleConvert',
      angleUnit: 'deg',
    });
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('\\frac{\\pi}{6}');
    }
  });
});
