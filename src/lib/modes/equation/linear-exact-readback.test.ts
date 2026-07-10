import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

describe('Equation linear exact readback', () => {
  it('reduces exact numeric affine roots on the public symbolic route', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '3x+5=20',
      equationSolveTarget: 'x',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=5');
  });
});
