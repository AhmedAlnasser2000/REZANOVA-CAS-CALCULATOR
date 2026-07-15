import { describe, expect, it } from 'vitest';
import { buildStatisticsModeRunPayload } from './runtime-run';

function runProbability(inputLatex: string, screenHint: 'binomial' | 'normal' | 'poisson') {
  return buildStatisticsModeRunPayload({
    inputLatex,
    screenHint,
    workingSourceHint: 'dataset',
  }).outcome;
}

describe('statistics probability outcomes', () => {
  it.each([
    ['exactly', 'x=2'],
    ['lessThan', 'x=2'],
    ['atMost', 'x=2'],
    ['moreThan', 'x=2'],
    ['atLeast', 'x=2'],
    ['between', 'lower=1,upper=3,lowerBound=exclusive,upperBound=inclusive'],
  ])('proves Canonical Result V2 for the Binomial %s event', (event, eventArguments) => {
    const result = runProbability(
      `binomial(n=4,p=0.5,event=${event},${eventArguments})`,
      'binomial',
    );

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('Expected probability success.');
    expect(result.canonicalResult?.version).toBe(2);
    expect(result.approxText).toContain('Probability=');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Percent:');
    expect(result.detailSections?.[1]?.lines.join(' ')).toContain('Expected value:');
  });

  it('labels Normal exact probability and density as different quantities', () => {
    const exact = runProbability('normal(mean=0,sd=1,event=exactly,x=0)', 'normal');
    const density = runProbability('normal(mean=0,sd=1,event=density,x=0)', 'normal');

    expect(exact.kind).toBe('success');
    expect(density.kind).toBe('success');
    if (exact.kind !== 'success' || density.kind !== 'success') {
      throw new Error('Expected Normal probability results.');
    }
    expect(exact.approxText).toContain('Probability=0');
    expect(exact.detailSections?.[0]?.lines.join(' ')).toContain('probability zero');
    expect(density.approxText).toContain('Density=');
    expect(density.detailSections?.[0]?.lines.join(' ')).toContain('not the probability');
  });

  it('rejects fractional event values for discrete distributions', () => {
    const result = runProbability('poisson(lambda=4,event=atMost,x=2.5)', 'poisson');

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') throw new Error('Expected discrete event error.');
    expect(result.error).toContain('integer');
  });
});
