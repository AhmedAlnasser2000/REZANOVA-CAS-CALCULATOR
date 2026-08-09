import { describe, expect, it } from 'vitest';
import { standardAntiderivativeExpression } from '../calculus/engine/antiderivative-expression';
import { pullbackAlgebraicGenus0Integral } from './integration/algebraic-genus0/pullback';
import { symbolicSuccess } from './integration/metadata';
import { resolveSymbolicIntegralFromLatex } from './integration';

describe('integration route-owned exact proof routing', () => {
  it('uses the inverse-trig table derivative proof without downgrading to numeric confidence', () => {
    const result = resolveSymbolicIntegralFromLatex('\\frac{3}{9+(2x+1)^2}');

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.strategy).toBe('inverse-trig');
      expect(result.verification).toMatchObject({
        status: 'verified-exact',
        reason: expect.stringContaining('exact affine-arctan derivative identity'),
      });
    }
  });

  it('retains direct-rule ownership for a pure polynomial genus-0 pullback', () => {
    const result = pullbackAlgebraicGenus0Integral(['Sqrt', ['Add', 'x', 1]], 'x', 't');

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.pullbackIntegral.strategy).toBe('direct-rule');
      expect(result.pullbackIntegral.verification.status).toBe('verified-exact');
    }
  });

  it('does not accept a native expression as exact without matching exact proof', () => {
    const result = symbolicSuccess(
      ['Power', 'x', 2],
      'x',
      'x',
      'direct-rule',
      {
        status: 'verified-numeric-confidence',
        reason: 'deliberately insufficient proof for this regression',
      },
      undefined,
      undefined,
      standardAntiderivativeExpression({
        mathJson: 'x',
        source: 'test:insufficient-route-proof',
      }),
      undefined,
      undefined,
      'precomputed-exact',
    );

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.verification.status).not.toBe('verified-exact');
    }
  });
});
