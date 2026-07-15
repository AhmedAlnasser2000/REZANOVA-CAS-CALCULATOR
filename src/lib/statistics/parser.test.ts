import { describe, expect, it } from 'vitest';
import { parseStatisticsDraft, statisticsRequestToScreen } from './parser';

describe('statistics parser', () => {
  it('parses dataset and descriptive structured requests', () => {
    const dataset = parseStatisticsDraft('dataset(values={12,15,15,18,20})');
    const descriptive = parseStatisticsDraft('descriptive(freq={1:2,2:3})');
    const meanInference = parseStatisticsDraft('meanInference(values={12,15,15,18,20}, mode=ci, level=0.95)');

    expect(dataset.ok).toBe(true);
    expect(descriptive.ok).toBe(true);
    expect(meanInference.ok).toBe(true);
    if (!dataset.ok || !descriptive.ok || !meanInference.ok) {
      throw new Error('Expected Statistics structured requests to parse');
    }
    expect(dataset.request.kind).toBe('dataset');
    expect(descriptive.request.kind).toBe('descriptive');
    expect(meanInference.request.kind).toBe('meanInference');
    if (descriptive.request.kind !== 'descriptive') {
      throw new Error('Expected descriptive request kind');
    }
    expect(descriptive.request.source).toBe('frequencyTable');
    expect(descriptive.request.quartiles).toBe('halves');
    expect(descriptive.request.context).toBe('compare');
  });

  it('parses explicit descriptive quartile and spread options', () => {
    const parsed = parseStatisticsDraft(
      'descriptive(values={1,2,3,4,100}, quartiles=linear, context=sample)',
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.request.kind !== 'descriptive') {
      throw new Error('Expected descriptive options to parse.');
    }
    expect(parsed.request).toMatchObject({ quartiles: 'linear', context: 'sample' });
  });

  it('parses shorthand dataset, table, probability, and point-set drafts', () => {
    const dataset = parseStatisticsDraft('12, 15, 15, 18, 20', { screenHint: 'dataEntry' });
    const table = parseStatisticsDraft('1:2, 2:3', { screenHint: 'frequency' });
    const binomial = parseStatisticsDraft('n=10, p=0.5, x=3, mode=pmf', { screenHint: 'binomial' });
    const regression = parseStatisticsDraft('(1,2), (2,4), (3,6)', { screenHint: 'regression' });

    expect(dataset.ok).toBe(true);
    expect(table.ok).toBe(true);
    expect(binomial.ok).toBe(true);
    expect(regression.ok).toBe(true);
    if (!dataset.ok || !table.ok || !binomial.ok || !regression.ok) {
      throw new Error('Expected Statistics shorthand requests to parse');
    }
    expect(dataset.request.kind).toBe('dataset');
    expect(table.request.kind).toBe('frequency');
    if (table.request.kind !== 'frequency') {
      throw new Error('Expected frequency request kind');
    }
    expect(table.request.source).toBe('frequencyTable');
    expect(binomial.request.kind).toBe('binomial');
    expect(regression.request.kind).toBe('regression');
  });

  it('parses event-based probability requests and independent interval bounds', () => {
    const oneSided = parseStatisticsDraft(
      'binomial(n=10,p=0.5,event=atLeast,x=3)',
      { screenHint: 'binomial' },
    );
    const between = parseStatisticsDraft(
      'normal(mean=0,sd=1,event=between,lower=-1,upper=1,lowerBound=exclusive,upperBound=inclusive)',
      { screenHint: 'normal' },
    );

    expect(oneSided.ok).toBe(true);
    expect(between.ok).toBe(true);
    if (!oneSided.ok || !between.ok) throw new Error('Expected probability event parsing.');
    expect(oneSided.request).toMatchObject({ event: 'atLeast', x: '3' });
    expect(between.request).toMatchObject({
      event: 'between',
      lower: '-1',
      upper: '1',
      lowerBound: 'exclusive',
      upperBound: 'inclusive',
    });
  });

  it('keeps legacy PMF, PDF, and CDF probability expressions loadable', () => {
    const binomial = parseStatisticsDraft('binomial(n=10,p=0.5,x=3,mode=pmf)');
    const normal = parseStatisticsDraft('normal(mean=0,sd=1,x=0,mode=pdf)');
    const poisson = parseStatisticsDraft('poisson(lambda=4,x=2,mode=cdf)');

    expect(binomial.ok && binomial.request).toMatchObject({ mode: 'pmf', x: '3' });
    expect(normal.ok && normal.request).toMatchObject({ mode: 'pdf', x: '0' });
    expect(poisson.ok && poisson.request).toMatchObject({ mode: 'cdf', x: '2' });
  });

  it('maps requests back to statistics screens', () => {
    const parsed = parseStatisticsDraft('meanInference(freq={1:2,2:3,4:1}, mode=test, level=0.95, mu0=2)');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error('Expected mean inference request to parse');
    }

    expect(statisticsRequestToScreen(parsed.request)).toBe('meanInference');
  });

  it('fails cleanly for unsupported free-form statistics input', () => {
    const parsed = parseStatisticsDraft('\\sin\\left(x\\right)');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      throw new Error('Expected unsupported Statistics input to fail');
    }
    expect(parsed.error).not.toContain('Calculate');
  });

  it('requires structured mean inference requests on the inference screen', () => {
    const parsed = parseStatisticsDraft('12, 15, 18', { screenHint: 'meanInference' });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      throw new Error('Expected shorthand mean inference input to fail');
    }
    expect(parsed.error).toContain('structured requests');
  });
});
