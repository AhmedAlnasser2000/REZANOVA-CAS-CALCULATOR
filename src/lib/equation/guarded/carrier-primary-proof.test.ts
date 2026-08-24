import { describe, expect, it } from 'vitest';
import { provenAcceptedCarrierCanonicalMath } from './polynomial-stage';

describe('Equation carrier primary proof', () => {
  it('builds single-root and multi-root primary proof from native root nodes', () => {
    expect(provenAcceptedCarrierCanonicalMath(
      [{ latex: '2', node: 2 }],
      'x=2',
      'carrier-proof-test-single',
    )).toEqual({ canonicalLatex: 'x=2', mathJson: ['Equal', 'x', 2] });

    expect(provenAcceptedCarrierCanonicalMath(
      [
        { latex: '-1', node: -1 },
        { latex: '1', node: 1 },
      ],
      String.raw`x\in\left\{-1, 1\right\}`,
      'carrier-proof-test-multi',
    )).toEqual({
      canonicalLatex: String.raw`x\in\left\{-1, 1\right\}`,
      mathJson: ['Element', 'x', ['Set', -1, 1]],
    });
  });

  it('fails closed on missing, conflicting, and unproven root evidence', () => {
    expect(provenAcceptedCarrierCanonicalMath(
      [{ latex: '1' }],
      'x=1',
      'carrier-proof-test-missing',
    )).toBeUndefined();

    expect(provenAcceptedCarrierCanonicalMath(
      [
        { latex: '1', node: 1 },
        { latex: '1', node: ['Add', 0, 1] },
      ],
      String.raw`x\in\left\{1, 1\right\}`,
      'carrier-proof-test-conflict',
    )).toBeUndefined();

    expect(provenAcceptedCarrierCanonicalMath(
      [{ latex: '1', node: 2 }],
      'x=1',
      'carrier-proof-test-unproven',
    )).toBeUndefined();
  });
});
