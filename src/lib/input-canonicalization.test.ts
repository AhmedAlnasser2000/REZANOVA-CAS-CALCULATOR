import { describe, expect, it } from 'vitest';
import { canonicalizeMathInput } from './input-canonicalization';

describe('canonicalizeMathInput', () => {
  it('canonicalizes reserved function tokens on open parentheses', () => {
    const result = canonicalizeMathInput('sin(', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\sin(');
  });

  it('canonicalizes typed trig functions to the same function commands used by the keyboard', () => {
    const result = canonicalizeMathInput('cos(x)', {
      mode: 'equation',
      screenHint: 'symbolic',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toContain('\\cos');
    expect(result.canonicalLatex).toContain('(x)');
  });

  it('canonicalizes pi but leaves bare e alone', () => {
    const piResult = canonicalizeMathInput('pi+1', {
      mode: 'calculate',
      screenHint: 'standard',
    });
    const eResult = canonicalizeMathInput('e+1', {
      mode: 'calculate',
      screenHint: 'standard',
    });

    expect(piResult.ok && piResult.canonicalLatex).toBe('\\pi+1');
    expect(eResult.ok && eResult.canonicalLatex).toBe('e+1');
  });

  it('does not guess glued tokens such as sinx', () => {
    const result = canonicalizeMathInput('sinx+1', {
      mode: 'calculate',
      screenHint: 'standard',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('sinx+1');
  });

  it('canonicalizes table editors the same way as calculate and equation', () => {
    const result = canonicalizeMathInput('tan(x)', {
      mode: 'table',
      screenHint: 'table',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toContain('\\tan');
  });

  it('canonicalizes pasted natural-log text with MathLive left-right fences', () => {
    const result = canonicalizeMathInput('ln\\left(x^2+1\\right)', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\ln(x^2+1)');
  });

  it('canonicalizes split natural-log letters produced by plain-text paste', () => {
    const result = canonicalizeMathInput('l n\\left(x^2+1\\right)', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\ln(x^2+1)');
  });

  it('removes empty MathLive definite-integral bounds before evaluation', () => {
    const result = canonicalizeMathInput('\\int_{}^{} 2x ln\\left(x^2+1\\right)\\,dx', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\int 2x \\ln(x^2+1)\\,dx');
  });

  it('repairs MathLive integral remnants left after deleting definite bounds', () => {
    const result = canonicalizeMathInput('\\int2x ln\\left(x^2+1\\right)\\,dx\\int_{}^{}', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\int 2x \\ln(x^2+1)\\,dx');
  });

  it('keeps non-empty definite-integral bounds intact', () => {
    const result = canonicalizeMathInput('\\int_0^1 x\\,dx', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\int_0^1 x\\,dx');
  });
});
