import type {PerformanceEvent, WatchedOperation} from './performance-watchdog';

export interface PerformanceSummary {
  complete: boolean;
  passed: boolean;
  failures: readonly string[];
  stages: Readonly<Record<string, {minimum: number; median: number; maximum: number; samples: number}>>;
}
export function performanceStages(fixture: string): readonly string[] {
  if (fixture.startsWith('rational-corpus-')) return ['setup', 'solving', 'checking', 'verification', 'encoding', 'replay-setup', 'decoding'];
  if (fixture.startsWith('nested-control-')) return ['construction', 'input', ...(fixture.startsWith('nested-control-stress-') ? ['ordinary-input'] : []), 'solving', 'verification', 'encoding', 'decoding'];
  if (['algebraic-performance-holomorphic', 'algebraic-performance-higher-genus', 'algebraic-performance-infinity', 'algebraic-performance-ramified-repeated'].includes(fixture)) return ['construction', 'solving', 'checking', 'verification', 'encoding', 'decoding'];
  if (['genus-one-integration-positive', 'genus-one-integration-negative', 'genus-one-integration-repeated'].includes(fixture)) return ['construction', 'solving', 'checking', 'verification', 'encoding', 'decoding'];
  if (['compact-negative-residue', 'compact-negative-polynomial-prefix', 'compact-negative-laurent-prefix', 'compact-negative-parent', 'compact-negative-residue-polynomial'].includes(fixture)) return ['construction', 'solving', 'checking', 'verification', 'encoding', 'decoding'];
  if (['genus-one-general-order-two', 'genus-one-general-negative'].includes(fixture)) return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  if (['modular-polynomial-resultant', 'modular-polynomial-norm'].includes(fixture)) return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  if (['compact-family-rde-resonance', 'compact-family-rde-negative', 'compact-family-limited-mixed', 'compact-family-limited-negative'].includes(fixture)) return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  if (fixture.startsWith('compact-transcendental-')) return ['construction', 'solving', 'checking', 'verification', 'encoding', 'decoding'];
  if (['balanced-logarithm-integration', 'balanced-negative-integration'].includes(fixture)) return ['construction', 'solving', 'checking', 'verification', 'encoding', 'decoding'];
  if (['balanced-torsion-order-two', 'balanced-torsion-negative'].includes(fixture)) return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  if (['balanced-cantor-order29', 'balanced-cantor-finite-order29', 'balanced-native-principal', 'balanced-native-not-principal'].includes(fixture)) return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  if (['compact-rational-quadratic', 'compact-rational-quartic', 'compact-rational-quintic'].includes(fixture)) return ['setup', 'solving', 'checking', 'verification', 'encoding', 'decoding'];
  if (['compact-exponential-inverse', 'compact-exponential-rootlog', 'compact-exponential-negative', 'compact-logarithmic-rootlog', 'compact-logarithmic-repeated', 'compact-logarithmic-negative'].includes(fixture)) return ['construction', 'solving', 'checking', 'verification', 'encoding', 'decoding'];
  if (['genus-zero-split', 'genus-zero-constant-extension', 'genus-zero-hidden-constants'].includes(fixture)) return ['construction', 'solving', 'checking', 'verification', 'encoding', 'decoding'];
  if (['rational-quadratic', 'rational-quartic', 'rational-quintic'].includes(fixture)) return ['setup', 'solving', 'verification', 'encoding', 'decoding'];
  if (['height-eight-exp', 'height-eight-mixed', 'height-eight-nested-log'].includes(fixture)) return ['construction', 'verification', 'encoding', 'decoding'];
  if (fixture === 'cubic-exactness') return ['setup', 'solving', 'verification', 'primitive-construction', 'primitive-checking', 'encoding', 'decoding'];
  if (fixture === 'elliptic-order-two') return ['setup', 'solving', 'verification', 'encoding', 'decoding'];
  // Subsidiary observation only: this is not either full Schultz integration cycle.
  if (fixture === 'order29-pell-principality') return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  if (fixture === 'order29-pell-torsion' || fixture === 'infinity-pell-negative') return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  if (fixture === 'cantor-closed-principality' || fixture === 'cantor-principality-negative') return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  if (fixture === 'cantor-finite-class-order') return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  if (fixture === 'ramified-cantor-order-three' || fixture === 'ramified-cantor-negative') return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  if (fixture === 'schultz-dependent-integration' || fixture === 'schultz-order29-integration') return ['construction', 'solving', 'checking', 'verification', 'encoding', 'decoding'];
  // Exact-linear subsidiary observations do not replace any named hard target.
  if (fixture === 'compact-linear-positive' || fixture === 'compact-linear-negative') return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  if (fixture === 'modular-resultant-rational' || fixture === 'modular-resultant-nested') return ['construction', 'solving', 'verification', 'encoding', 'decoding'];
  throw Error(`No acceptance coverage declared for fixture ${fixture}`);
}
/** Observational acceptance has no mathematical authority and never drops a slow sample. */
export function summarizePerformance(fixture: string, result: WatchedOperation): PerformanceSummary {
  const failures: string[] = [], stages: Record<string, {minimum: number; median: number; maximum: number; samples: number}> = {};
  let complete = result.status === 'completed';
  if (!complete) failures.push(result.status);
  for (const stage of performanceStages(fixture)) {
    const values: number[] = [];
    for (let sample = -2; sample < 5; sample++) {
      const matches = result.events.filter(e => e.event === 'sample' && e.stage === stage && e.sample === sample);
      if (matches.length !== 1 || !Number.isFinite(matches[0].milliseconds) || matches[0].milliseconds! < 0) {
        complete = false; failures.push(`${stage} sample ${sample}: missing/duplicate/invalid`); continue;
      }
      if (sample >= 0) values.push(matches[0].milliseconds!);
    }
    if (values.length === 5) {
      const sorted = [...values].sort((a, b) => a - b);
      stages[stage] = {minimum: sorted[0], median: sorted[2], maximum: sorted[4], samples: 5};
      if (fixture.startsWith('height-eight-') && stage === 'construction' && values.some(v => v >= 1000))
        failures.push('construction: at least one sample misses the strict 1-second target');
      if (fixture === 'cubic-exactness' && (stage === 'solving' || stage === 'verification') && values.some(v => v >= 1000))
        failures.push(`${stage}: at least one sample misses the strict 1-second target`);
      if (fixture === 'elliptic-order-two' && stage === 'solving' && values.some(v => v >= 1000))
        failures.push('solving: at least one sample misses the strict 1-second target');
    }
  }
  if (fixture === 'schultz-dependent-integration' || fixture === 'schultz-order29-integration') {
    for (let sample = 0; sample < 5; sample++) {
      const values = performanceStages(fixture).map(stage => result.events.filter(e => e.event === 'sample' && e.stage === stage && e.sample === sample));
      if (values.every(v => v.length === 1 && Number.isFinite(v[0].milliseconds)) && values.reduce((sum, v) => sum + v[0].milliseconds!, 0) >= 60000)
        failures.push(`complete cycle sample ${sample}: misses the strict 60-second target`);
    }
  }
  return {complete, passed: complete && failures.length === 0, failures, stages};
}
export function comparePerformanceControls(baseline: readonly PerformanceEvent[], current: readonly PerformanceEvent[]): readonly string[] {
  const failures: string[] = [], keys = new Set([...baseline, ...current].filter(e => e.event === 'sample' && e.sample! >= 0 && e.milliseconds !== undefined)
    .map(e => `${e.fixture}\0${e.stage}`));
  for (const key of keys) {
    const [fixture, stage] = key.split('\0');
    const values = (events: readonly PerformanceEvent[]) => {
      const records = events.filter(e => e.event === 'sample' && e.fixture === fixture && e.stage === stage && e.sample! >= 0);
      if (records.length !== 5 || new Set(records.map(e => e.sample)).size !== 5 || records.some(e => e.sample! > 4)) return [];
      return records.map(e => e.milliseconds!).sort((a, b) => a - b);
    };
    const before = values(baseline), after = values(current);
    if (before.length !== 5 || after.length !== 5 || [...before, ...after].some(v => !Number.isFinite(v))) {
      failures.push(`${fixture}/${stage}: incomplete comparison`); continue;
    }
    if (after[2] - before[2] > Math.max(before[2] * 0.2, 20)) failures.push(`${fixture}/${stage}: median regression`);
  }
  return failures;
}
