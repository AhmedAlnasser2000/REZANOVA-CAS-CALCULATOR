import { describe, expect, it } from 'vitest';
import {
  createProfiledMathValue,
  hasPrimaryMathParity,
  profileDomainMathValue,
  profileMathValue,
} from './payload';

describe('display math payload', () => {
  it('copies a bounded answer node and preserves the compatibility LaTeX exactly', () => {
    const node = ['Divide', 'Pi', 2];
    const payload = createProfiledMathValue('\\frac{\\pi}{2}', node);

    expect(payload).toEqual({
      canonicalLatex: '\\frac{\\pi}{2}',
      mathJson: node,
    });
    expect(payload?.mathJson).not.toBe(node);
    expect(hasPrimaryMathParity({
      exactLatex: '\\frac{\\pi}{2}',
      primaryMath: payload,
    })).toBe(true);
  });

  it('keeps canonical LaTeX while omitting an invalid optional MathJSON node', () => {
    const payload = createProfiledMathValue('x=1', ['Equal', 'x', Number.NaN]);
    expect(payload).toEqual({ canonicalLatex: 'x=1' });
  });

  it('rejects empty canonical LaTeX and detects parity drift', () => {
    expect(createProfiledMathValue('  ', ['Add', 1, 2])).toBeUndefined();
    expect(hasPrimaryMathParity({
      exactLatex: 'x=1',
      primaryMath: { canonicalLatex: 'x=2' },
    })).toBe(false);
  });

  it('opts a proven answer tree into the pedagogical profile with payload parity', () => {
    expect(profileMathValue('(x+1)(x+1)', [
      'Multiply',
      ['Add', 1, 'x'],
      ['Add', 1, 'x'],
    ])).toEqual({
      canonicalLatex: '(1+x)(1+x)',
      primaryMath: {
        canonicalLatex: '(1+x)(1+x)',
        mathJson: ['Multiply', ['Add', 1, 'x'], ['Add', 1, 'x']],
      },
      changed: true,
      source: 'math-json',
    });
  });

  it('fails closed to compatibility LaTeX when the optional answer tree is invalid', () => {
    expect(profileMathValue('x=1', ['Equal', 'x', Number.NaN])).toEqual({
      canonicalLatex: 'x=1',
      primaryMath: { canonicalLatex: 'x=1' },
      changed: false,
      source: 'compatibility-fallback',
    });
  });

  it('lets a proven native-domain serializer own the pedagogical profile without drift', () => {
    expect(profileDomainMathValue('(x+1)(x+1)', [
      'Multiply',
      ['Add', 1, 'x'],
      ['Add', 1, 'x'],
    ])).toEqual({
      canonicalLatex: '(x+1)(x+1)',
      primaryMath: {
        canonicalLatex: '(x+1)(x+1)',
        mathJson: ['Multiply', ['Add', 1, 'x'], ['Add', 1, 'x']],
      },
      changed: false,
      source: 'domain-adapter',
    });
  });
});
