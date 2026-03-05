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

  it('does not offer Equation handoff for range-proven impossible trig equations', () => {
    const { outcome } = runTrigonometryCoreDraft('\\sin\\left(x^2\\right)=5', {
      screenHint: 'equationSolve',
      angleUnit: 'deg',
    });

    expect(outcome.kind).toBe('error');
    if (outcome.kind !== 'error') {
      throw new Error('Expected trig equation error');
    }
    expect(outcome.solveBadges).toContain('Range Guard');
    expect(outcome.actions).toBeUndefined();
  });

  it('still offers Equation handoff for numeric-eligible unresolved trig equations', () => {
    const { outcome } = runTrigonometryCoreDraft('\\cos\\left(x\\right)=x', {
      screenHint: 'equationSolve',
      angleUnit: 'deg',
    });

    expect(outcome.kind).toBe('error');
    if (outcome.kind !== 'error') {
      throw new Error('Expected trig equation error');
    }
    expect(outcome.actions?.[0]).toEqual({
      kind: 'send',
      target: 'equation',
      latex: '\\cos(x)=x',
    });
  });

  it('shares exp/log solve provenance with Equation in trig equation flow', () => {
    const { outcome } = runTrigonometryCoreDraft('e^{2x}-5e^x+6=0', {
      screenHint: 'equationSolve',
      angleUnit: 'deg',
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') {
      throw new Error('Expected trig equation success');
    }
    expect(outcome.solveBadges).toContain('Symbolic Substitution');
    expect(outcome.solveBadges).toContain('Inverse Isolation');
    expect(outcome.actions).toBeUndefined();
  });
});
