import { describe, expect, it } from 'vitest';
import { boxLatex } from './patterns';
import { normalizeDerivativeOutputNode } from './differentiation-normalization';

describe('normalizeDerivativeOutputNode', () => {
  it('compacts repeated product factors into powers', () => {
    expect(boxLatex(normalizeDerivativeOutputNode(['Multiply', 4, 't', 't', 't']))).toBe('4t^3');
  });

  it('collects identical additive terms after bounded distribution', () => {
    expect(boxLatex(normalizeDerivativeOutputNode([
      'Multiply',
      -2,
      't',
      [
        'Add',
        ['Multiply', -8, 't', 't', 't', ['Sin', ['Power', 't', 2]]],
        ['Multiply', 12, 't', ['Cos', ['Power', 't', 2]]],
      ],
    ]))).toBe('16\\sin(t^2)t^4-24\\cos(t^2)t^2');
  });
});
