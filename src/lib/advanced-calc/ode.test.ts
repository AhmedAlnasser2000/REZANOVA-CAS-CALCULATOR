import { describe, expect, it } from 'vitest';
import {
  solveFirstOrderOde,
  solveSecondOrderOde,
} from './ode';

describe('advanced calc ode', () => {
  it('solves supported separable and linear first-order cases', () => {
    const separable = solveFirstOrderOde({
      lhsLatex: '\\frac{dy}{dx}',
      rhsLatex: 'xy',
      classification: 'separable',
    });
    expect(separable.error).toBeUndefined();
    expect(separable.exactLatex).toContain('e');

    const linear = solveFirstOrderOde({
      lhsLatex: '\\frac{dy}{dx}',
      rhsLatex: '2y+3',
      classification: 'linear',
    });
    expect(linear.error).toBeUndefined();
  });

  it('solves supported second-order homogeneous cases', () => {
    const result = solveSecondOrderOde({
      a2: '1',
      a1: '0',
      a0: '1',
      forcingLatex: '0',
    });
    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('\\cos');
  });
});
