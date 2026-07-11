import { describe, expect, it } from 'vitest';
import {
  createDisplayMathPayload,
  hasDisplayMathPayloadParity,
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
});
