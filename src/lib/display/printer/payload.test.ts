import { describe, expect, it } from 'vitest';
import {
  createDisplayMathPayload,
  hasDisplayMathPayloadParity,
  profileDomainDisplayMathPayload,
  profileDisplayMathPayload,
} from './payload';

describe('display math payload', () => {
  it('copies a bounded answer node and preserves the compatibility LaTeX exactly', () => {
    const node = ['Divide', 'Pi', 2];
    const payload = createDisplayMathPayload('\\frac{\\pi}{2}', node);

    expect(payload).toEqual({
      version: 1,
      canonicalLatex: '\\frac{\\pi}{2}',
      mathJson: node,
    });
    expect(payload?.mathJson).not.toBe(node);
    expect(hasDisplayMathPayloadParity({
      exactLatex: '\\frac{\\pi}{2}',
      canonicalMath: payload,
    })).toBe(true);
  });

  it('keeps canonical LaTeX while omitting an invalid optional MathJSON node', () => {
    const payload = createDisplayMathPayload('x=1', ['Equal', 'x', Number.NaN]);
    expect(payload).toEqual({ version: 1, canonicalLatex: 'x=1' });
  });

  it('rejects empty canonical LaTeX and detects parity drift', () => {
    expect(createDisplayMathPayload('  ', ['Add', 1, 2])).toBeUndefined();
    expect(hasDisplayMathPayloadParity({
      exactLatex: 'x=1',
      canonicalMath: { version: 1, canonicalLatex: 'x=2' },
    })).toBe(false);
  });

  it('opts a proven answer tree into the pedagogical profile with payload parity', () => {
    expect(profileDisplayMathPayload('(x+1)(x+1)', [
      'Multiply',
      ['Add', 1, 'x'],
      ['Add', 1, 'x'],
    ])).toEqual({
      canonicalLatex: '(1+x)(1+x)',
      canonicalMath: {
        version: 1,
        canonicalLatex: '(1+x)(1+x)',
        mathJson: ['Multiply', ['Add', 1, 'x'], ['Add', 1, 'x']],
      },
      changed: true,
      source: 'math-json',
    });
  });

  it('fails closed to compatibility LaTeX when the optional answer tree is invalid', () => {
    expect(profileDisplayMathPayload('x=1', ['Equal', 'x', Number.NaN])).toEqual({
      canonicalLatex: 'x=1',
      canonicalMath: { version: 1, canonicalLatex: 'x=1' },
      changed: false,
      source: 'compatibility-fallback',
    });
  });

  it('lets a proven native-domain serializer own the pedagogical profile without drift', () => {
    expect(profileDomainDisplayMathPayload('(x+1)(x+1)', [
      'Multiply',
      ['Add', 1, 'x'],
      ['Add', 1, 'x'],
    ])).toEqual({
      canonicalLatex: '(x+1)(x+1)',
      canonicalMath: {
        version: 1,
        canonicalLatex: '(x+1)(x+1)',
        mathJson: ['Multiply', ['Add', 1, 'x'], ['Add', 1, 'x']],
      },
      changed: false,
      source: 'domain-adapter',
    });
  });
});
