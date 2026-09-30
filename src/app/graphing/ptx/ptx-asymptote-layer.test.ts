import { describe, expect, it } from 'vitest';
import { asymptoteLabelNumber } from './ptx-asymptote-layer';

describe('asymptote labels', () => {
  it('names multiples of π and keeps other numbers short', () => {
    expect(asymptoteLabelNumber(Math.PI / 2)).toBe('π/2');
    expect(asymptoteLabelNumber(-3 * Math.PI / 2)).toBe('−3π/2');
    expect(asymptoteLabelNumber(Math.PI)).toBe('π');
    expect(asymptoteLabelNumber(-Math.PI / 6)).toBe('−π/6');
    expect(asymptoteLabelNumber(0)).toBe('0');
    expect(asymptoteLabelNumber(1)).toBe('1');
    expect(asymptoteLabelNumber(-2.5)).toBe('−2.5');
  });
});
