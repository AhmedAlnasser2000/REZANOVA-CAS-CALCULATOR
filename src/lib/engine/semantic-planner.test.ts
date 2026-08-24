import { describe, expect, it } from 'vitest';
import { planMathExecution } from './semantic-planner';

function compact(source: string) {
  return source.replaceAll('\\left', '').replaceAll('\\right', '').replace(/\s+/g, '');
}

describe('planMathExecution', () => {
  it('plans textual nth roots through the same structured math as nth-root notation', () => {
    const textual = planMathExecution('root(3,sqrt(x))', {
      mode: 'calculate',
      intent: 'calculate-simplify',
      angleUnit: 'deg',
      screenHint: 'standard',
    });
    const structured = planMathExecution('\\sqrt[3]{\\sqrt{x}}', {
      mode: 'calculate',
      intent: 'calculate-simplify',
      angleUnit: 'deg',
      screenHint: 'standard',
    });

    expect(textual.kind).toBe('ready');
    expect(structured.kind).toBe('ready');
    if (textual.kind !== 'ready' || structured.kind !== 'ready') {
      throw new Error('Expected ready planner outcomes');
    }
    expect(textual.resolvedMathJson).toEqual(structured.resolvedMathJson);
  });

  it('blocks invalid textual nth-root indices before solver parsing', () => {
    const result = planMathExecution('root(-3,x)', {
      mode: 'calculate',
      intent: 'calculate-simplify',
      angleUnit: 'deg',
      screenHint: 'standard',
    });

    expect(result).toMatchObject({
      kind: 'blocked',
      badges: ['Hard Stop'],
    });
    if (result.kind !== 'blocked') {
      throw new Error('Expected a blocked planner outcome');
    }
    expect(result.error).toContain('integer index of at least 2');
  });

  it('reduces embedded derivatives before equation solving', () => {
    const result = planMathExecution('12+\\frac{d}{dx}(5x)+6x=5', {
      mode: 'equation',
      intent: 'equation-solve',
      angleUnit: 'deg',
      screenHint: 'symbolic',
    });

    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') {
      throw new Error('Expected a ready planner result');
    }
    const normalized = compact(result.resolvedLatex);
    expect(normalized).not.toContain('\\frac{d}{dx}');
    expect(normalized).toContain('6x');
    expect(normalized).toContain('17');
    expect(result.badges).toContain('Reduced Derivative');
  });

  it('uses the app-owned derivative rules for chain rule reductions', () => {
    const result = planMathExecution('\\frac{d}{dx}(\\sin(x^2))', {
      mode: 'calculate',
      intent: 'calculate-evaluate',
      angleUnit: 'deg',
      screenHint: 'standard',
    });

    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') {
      throw new Error('Expected a ready planner result');
    }
    const normalized = compact(result.resolvedLatex);
    expect(normalized).toContain('2x');
    expect(normalized).toContain('\\cos');
    expect(normalized).toContain('x^2');
  });

  it('compacts repeated trig factors structurally', () => {
    const result = planMathExecution('\\cos(x)\\cos(x)', {
      mode: 'trigonometry',
      intent: 'trig-evaluate',
      angleUnit: 'deg',
      screenHint: 'functions',
    });

    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') {
      throw new Error('Expected a ready planner result');
    }
    expect(compact(result.resolvedLatex)).toContain('\\cos');
    expect(compact(result.resolvedLatex)).toContain('^2');
    expect(result.badges).toContain('Compacted Repeated Factors');
  });

  it('hard-stops unsupported indefinite integrals inside equations', () => {
    const result = planMathExecution('\\int x\\,dx+x=3', {
      mode: 'equation',
      intent: 'equation-solve',
      angleUnit: 'deg',
      screenHint: 'symbolic',
    });

    expect(result.kind).toBe('blocked');
    if (result.kind !== 'blocked') {
      throw new Error('Expected a blocked planner result');
    }
    expect(result.error).toContain('indefinite integral');
    expect(result.badges).toContain('Hard Stop');
  });
});
