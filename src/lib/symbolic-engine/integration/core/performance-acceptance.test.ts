import {describe, expect, it} from 'vitest';
import {summarizePerformance, comparePerformanceControls, performanceStages} from './__tests__/performance-acceptance';
import type {PerformanceEvent, WatchedOperation} from './__tests__/performance-watchdog';
function events(fixture = 'height-eight-exp'): PerformanceEvent[] {
  return ['construction', 'verification', 'encoding', 'decoding'].flatMap(stage => Array.from({length: 7}, (_, i) =>
    ({event: 'sample' as const, fixture, stage, sample: i - 2, milliseconds: 900})));
}
function result(records: PerformanceEvent[]): WatchedOperation {
  return {status: 'completed', elapsedMs: 1, stageElapsedMs: 1, stoppedAt: '', events: records, rss: 0, highWaterRss: 0, developmentOnly: true, mathematicalDecision: false};
}
describe('complete observational performance acceptance', () => {
  it('requires both warmups, five samples and every declared stage', () => {
    expect(summarizePerformance('height-eight-exp', result(events())).passed).toBe(true);
    expect(summarizePerformance('height-eight-exp', result(events().slice(1))).complete).toBe(false);
    expect(summarizePerformance('height-eight-exp', result([...events(), events()[0]])).complete).toBe(false);
    expect(summarizePerformance('height-eight-exp', {...result(events()), status: 'watchdog-stopped'}).passed).toBe(false);
  });
  it('checks every measured sample against the strict target rather than just the median', () => {
    const e = events(); e.find(v => v.stage === 'construction' && v.sample === 4)!.milliseconds = 1000;
    const summary = summarizePerformance('height-eight-exp', result(e));
    expect(summary.complete).toBe(true); expect(summary.passed).toBe(false); expect(summary.stages.construction.median).toBe(900);
    expect(summary.stages.construction.maximum).toBe(1000);
  });
  it('compares complete control medians using the approved absolute/relative allowance', () => {
    const baseline = events('rational-quadratic'), current = events('rational-quadratic');
    for (const e of current) e.milliseconds = 1000;
    expect(comparePerformanceControls(baseline, current)).toEqual([]);
    for (const e of current) e.milliseconds = 1200;
    expect(comparePerformanceControls(baseline, current)).toHaveLength(4);
    expect(comparePerformanceControls(baseline, current.slice(1))).toHaveLength(4);
  });
  it('applies the Schultz target to each complete cycle including construction and fresh replay', () => {
    const fixture = 'schultz-order29-integration', e: PerformanceEvent[] = performanceStages(fixture).flatMap(stage => Array.from({length: 7}, (_, i) => ({event: 'sample', fixture, stage, sample: i - 2, milliseconds: 9000})));
    expect(summarizePerformance(fixture, result(e)).passed).toBe(true);
    e.find(v => v.stage === 'construction' && v.sample === 4)!.milliseconds = 16000;
    const failed = summarizePerformance(fixture, result(e)); expect(failed.complete).toBe(true); expect(failed.passed).toBe(false);
    expect(failed.failures).toEqual(['complete cycle sample 4: misses the strict 60-second target']);
    expect(summarizePerformance(fixture, result(e.filter(v => !(v.stage === 'decoding' && v.sample === 4)))).complete).toBe(false);
  });
});
