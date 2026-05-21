import { describe, expect, it } from 'vitest';
import {
  areComplexClose,
  complex,
  complexAdd,
  complexDiv,
  complexMul,
  complexSqrt,
  complexSub,
  complexToApproxText,
  complexToLatex,
  normalizeComplex,
} from './complex';

describe('complex utilities', () => {
  it('formats pure and mixed imaginary values', () => {
    expect(complexToLatex(complex(0, 1))).toBe('i');
    expect(complexToLatex(complex(0, -1))).toBe('-i');
    expect(complexToLatex(complex(-1, 1))).toBe('-1+i');
    expect(complexToApproxText(complex(0.87026667, 1.0364649))).toBe('0.870267 + 1.036465i');
  });

  it('normalizes near-zero components', () => {
    expect(normalizeComplex({ re: -1e-12, im: 1e-12 })).toEqual({ re: 0, im: 0 });
  });

  it('supports arithmetic helpers', () => {
    const left = complex(2, 3);
    const right = complex(1, -4);

    expect(complexAdd(left, right)).toEqual({ re: 3, im: -1 });
    expect(complexSub(left, right)).toEqual({ re: 1, im: 7 });
    expect(complexMul(left, right)).toEqual({ re: 14, im: -5 });
    expect(areComplexClose(complexDiv(left, right), { re: -0.5882352941, im: 0.6470588235 })).toBe(true);
  });

  it('computes complex square roots', () => {
    expect(complexSqrt(complex(-4, 0))).toEqual({ re: 0, im: 2 });
    expect(areComplexClose(complexSqrt(complex(3, 4)), { re: 2, im: 1 })).toBe(true);
  });
});
