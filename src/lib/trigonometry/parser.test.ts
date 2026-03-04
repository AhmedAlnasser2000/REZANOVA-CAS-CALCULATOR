import { describe, expect, it } from 'vitest';
import { parseTrigDraft, trigRequestToScreen } from './parser';

describe('trigonometry parser', () => {
  it('parses raw function and identity drafts in leaf contexts', () => {
    expect(parseTrigDraft('\\sin\\left(30\\right)', { screenHint: 'functions' })).toEqual({
      ok: true,
      request: {
        kind: 'function',
        expressionLatex: '\\sin(30)',
      },
      style: 'shorthand',
    });

    expect(
      parseTrigDraft('\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)', {
        screenHint: 'identitySimplify',
      }),
    ).toEqual({
      ok: true,
      request: {
        kind: 'identitySimplify',
        expressionLatex: '\\sin^2(x)+\\cos^2(x)',
      },
      style: 'shorthand',
    });
  });

  it('parses structured trig requests', () => {
    expect(
      parseTrigDraft('identityConvert(expr=\\sin(A)\\sin(B), target=productToSum)'),
    ).toEqual({
      ok: true,
      request: {
        kind: 'identityConvert',
        expressionLatex: '\\sin(A)\\sin(B)',
        targetForm: 'productToSum',
      },
      style: 'structured',
    });

    expect(parseTrigDraft('rightTriangle(a=3, b=4)')).toEqual({
      ok: true,
      request: {
        kind: 'rightTriangle',
        knownSideA: '3',
        knownSideB: '4',
        knownSideC: undefined,
        knownAngleA: undefined,
        knownAngleB: undefined,
      },
      style: 'structured',
    });
  });

  it('parses trig shorthand for numeric tools', () => {
    expect(parseTrigDraft('a=3, b=4', { screenHint: 'rightTriangle' })).toEqual({
      ok: true,
      request: {
        kind: 'rightTriangle',
        knownSideA: '3',
        knownSideB: '4',
        knownSideC: undefined,
        knownAngleA: undefined,
        knownAngleB: undefined,
      },
      style: 'shorthand',
    });

    expect(parseTrigDraft('30 deg -> rad', { screenHint: 'angleConvert' })).toEqual({
      ok: true,
      request: {
        kind: 'angleConvert',
        valueLatex: '30',
        from: 'deg',
        to: 'rad',
      },
      style: 'shorthand',
    });
  });

  it('rejects raw identities in function contexts with a clear message', () => {
    const result = parseTrigDraft('\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)', {
      screenHint: 'functions',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('identity');
    }
  });

  it('maps parsed request kinds back to trig screens', () => {
    expect(
      trigRequestToScreen({ kind: 'function', expressionLatex: '\\cos\\left(\\frac{\\pi}{3}\\right)' }, 'specialAngles'),
    ).toBe('specialAngles');
    expect(
      trigRequestToScreen({ kind: 'cosineRule', sideA: '5', sideB: '7', angleC: '60' }),
    ).toBe('cosineRule');
  });
});
