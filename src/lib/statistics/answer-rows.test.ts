import { describe, expect, it } from 'vitest';
import type { StatisticsScreen, StatisticsWorkingSource } from '../../types/calculator';
import { buildStatisticsModeRunPayload } from './runtime-run';

const CASES: Array<{
  inputLatex: string;
  screenHint: StatisticsScreen;
  workingSourceHint: StatisticsWorkingSource;
}> = [
  { inputLatex: 'dataset(values={1,2,3})', screenHint: 'dataEntry', workingSourceHint: 'dataset' },
  { inputLatex: 'descriptive(values={1,2,2,4},quartiles=halves,context=compare)', screenHint: 'descriptive', workingSourceHint: 'dataset' },
  { inputLatex: 'frequency(freq={1:2,2:3})', screenHint: 'frequency', workingSourceHint: 'frequencyTable' },
  { inputLatex: 'binomial(n=8,p=0.5,event=atLeast,x=5)', screenHint: 'binomial', workingSourceHint: 'dataset' },
  { inputLatex: 'normal(mean=0,sd=1,event=between,lower=-1,upper=1)', screenHint: 'normal', workingSourceHint: 'dataset' },
  { inputLatex: 'meanInference(values={8,9,10,11},mode=ci,level=0.95)', screenHint: 'meanInference', workingSourceHint: 'dataset' },
  { inputLatex: 'meanInference(values={8,9,10,11},mode=test,level=0.95,mu0=8,alternative=greater)', screenHint: 'meanInference', workingSourceHint: 'dataset' },
  { inputLatex: 'regression(points={(1,2),(2,4),(3,5)})', screenHint: 'regression', workingSourceHint: 'dataset' },
  { inputLatex: 'correlation(points={(1,2),(2,4),(3,5)})', screenHint: 'correlation', workingSourceHint: 'dataset' },
];

describe('Statistics vertical answer rows', () => {
  it.each(CASES)('proves labeled Canonical Result V2 rows for $screenHint', (request) => {
    const outcome = buildStatisticsModeRunPayload(request).outcome;

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') throw new Error('Expected Statistics success.');
    if (!outcome.canonicalResult) throw new Error('Expected a canonical Statistics result.');
    expect(outcome.canonicalResult.version).toBe(2);
    expect(outcome.exactLatex).toBeTruthy();
    expect(outcome.answerRows?.rows.length).toBeGreaterThan(0);
    expect(outcome.answerRows?.rows.every((row) => Boolean(row.label))).toBe(true);
    expect(outcome.canonicalResult.answerRows?.rows).toHaveLength(outcome.answerRows?.rows.length ?? 0);
    for (const row of outcome.canonicalResult.answerRows?.rows ?? []) {
      expect(row.math.canonicalLatex).toBeTruthy();
      expect(row.math.mathJson).toBeDefined();
    }
  });

  it('uses the requested approximate digits without leaking them into later evaluations', () => {
    const request = {
      inputLatex: 'regression(points={(1,1),(2,4),(3,6)})',
      screenHint: 'regression' as const,
      workingSourceHint: 'dataset' as const,
    };
    const rounded = buildStatisticsModeRunPayload({ ...request, approxDigits: 2 }).outcome;
    const defaultPrecision = buildStatisticsModeRunPayload(request).outcome;

    expect(rounded.kind).toBe('success');
    expect(defaultPrecision.kind).toBe('success');
    if (rounded.kind !== 'success' || defaultPrecision.kind !== 'success') {
      throw new Error('Expected Statistics successes.');
    }
    const roundedRows = rounded.answerRows?.rows.map((row) => row.latex).join(' ') ?? '';
    const defaultRows = defaultPrecision.answerRows?.rows.map((row) => row.latex).join(' ') ?? '';
    expect(roundedRows).toContain('-1.33');
    expect(roundedRows).not.toContain('-1.333333');
    expect(defaultRows).toContain('-1.333333');
  });

  it('keeps hypothesis parentheses in producer-owned MathJSON evidence', () => {
    const outcome = buildStatisticsModeRunPayload({
      inputLatex: 'meanInference(values={8,9,10,11},mode=test,level=0.95,mu0=8,alternative=greater)',
      screenHint: 'meanInference',
      workingSourceHint: 'dataset',
    }).outcome;

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success' || outcome.canonicalResult?.version !== 2) {
      throw new Error('Expected a Canonical Result V2 mean-test success.');
    }
    const hypotheses = outcome.canonicalResult.answerRows?.rows
      .find((row) => row.label === 'Hypotheses');
    expect(hypotheses?.math).toEqual({
      canonicalLatex: 'H_0=(\\mu=8),\\ H_a=(\\mu>8)',
      mathJson: [
        'Delimiter',
        ['Sequence',
          ['Equal', ['Subscript', 'H', 0], ['Delimiter', ['Equal', 'mu', 8]]],
          ['Equal', ['Subscript', 'H', 'a'], ['Delimiter', ['Greater', 'mu', 8]]],
        ],
        "','",
      ],
    });
  });
});
