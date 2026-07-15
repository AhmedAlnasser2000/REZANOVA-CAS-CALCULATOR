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
});
