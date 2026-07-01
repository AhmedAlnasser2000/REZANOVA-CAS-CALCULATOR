import { describe, expect, it } from 'vitest';

import {
  classifyRealDomainFactsOverInterval,
  evaluateRealIntervalLatex,
} from './real-interval-arithmetic';
import type { EquationNumericDomainFact } from './numeric-domain-segmentation';

function fact(input: Partial<EquationNumericDomainFact> & Pick<EquationNumericDomainFact, 'kind' | 'message'>): EquationNumericDomainFact {
  return {
    source: 'symbolic-scan',
    ...input,
  };
}

describe('real interval arithmetic domain substrate', () => {
  it('evaluates basic target expressions over an interval', () => {
    const result = evaluateRealIntervalLatex('x^2-1', 'x', { left: -2, right: 3 });

    expect(result.kind).toBe('known');
    if (result.kind !== 'known') {
      throw new Error('Expected known interval');
    }
    expect(result.interval.left).toBeLessThanOrEqual(-1);
    expect(result.interval.right).toBeGreaterThanOrEqual(8);
  });

  it('classifies obvious safe, invalid, and split-required domain intervals', () => {
    const facts: EquationNumericDomainFact[] = [
      fact({
        kind: 'log-domain',
        expressionLatex: 'x-1',
        relationLatex: '>0',
        message: 'x-1 >0',
      }),
      fact({
        kind: 'denominator-exclusion',
        expressionLatex: 'x-2',
        relationLatex: '\\ne0',
        message: 'x-2 \\ne0',
      }),
      fact({
        kind: 'root-domain',
        expressionLatex: 'x+1',
        relationLatex: '\\ge0',
        message: 'x+1 \\ge0',
      }),
    ];

    const safe = classifyRealDomainFactsOverInterval({ facts, target: 'x', start: 3, end: 5 });
    expect(safe.status).toBe('safe');
    expect(safe.safeCount).toBe(3);

    const split = classifyRealDomainFactsOverInterval({ facts, target: 'x', start: 0, end: 5 });
    expect(split.status).toBe('split-required');
    expect(split.splitRequiredCount).toBe(2);

    const invalid = classifyRealDomainFactsOverInterval({ facts: [facts[0]], target: 'x', start: -5, end: 0 });
    expect(invalid.status).toBe('invalid');
    expect(invalid.invalidCount).toBe(1);
  });

  it('keeps unresolved symbolic expressions unknown instead of pretending numeric proof', () => {
    const result = classifyRealDomainFactsOverInterval({
      facts: [
        fact({
          kind: 'log-domain',
          expressionLatex: 'x+a',
          relationLatex: '>0',
          message: 'x+a >0',
        }),
      ],
      target: 'x',
      start: 0,
      end: 1,
    });

    expect(result.status).toBe('unknown');
    expect(result.unknownCount).toBe(1);
    expect(result.classifications[0].evidence).toContain('unresolved symbol');
  });
});
