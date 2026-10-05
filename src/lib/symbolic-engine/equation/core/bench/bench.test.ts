import { describe as group, expect, it } from 'vitest';
import { context } from '../test-support';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { ExpressionStore } from '../representation/expression';
import { readRelations } from '../representation/mathjson';
import { relationProblem } from '../representation/relation';
import { CORPUS, type CorpusCase } from './corpus';

/**
 * The corpus as a correctness gate (always on: one verified run per case) and,
 * with EQUATION_BENCH=1, as a benchmark: medians of decide and verify, each in
 * a fresh store (5 repetitions for cases under 1 s, 3 otherwise).
 */
function prepare(c: CorpusCase) {
  const store = new ExpressionStore(context());
  const r = readRelations(store, c.json);
  if (r.kind !== 'ok') throw new Error(`${c.id}: ${JSON.stringify(r)}`);
  return relationProblem(store, { domain: c.domain ?? 'real', targets: [...(c.targets ?? ['x'])], relations: r.value });
}
function once(c: CorpusCase): { decide: number; verify: number; kind: string } {
  const problem = prepare(c);
  const t0 = performance.now();
  const outcome = decideEquation(problem);
  const t1 = performance.now();
  verifyEquationOutcome(problem, outcome);
  return { decide: t1 - t0, verify: performance.now() - t1, kind: outcome.kind };
}
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

const bench = process.env.EQUATION_BENCH === '1';

group('benchmark corpus', () => {
  it.skipIf(bench).each(CORPUS.map(c => [c.id, c] as const))('%s decides as expected and verifies', (_, c) => {
    expect(once(c).kind).toBe(c.expect);
  }, 600_000);

  it.runIf(bench)('medians', () => {
    const rows: string[] = ['| Case | Decide (ms) | Verify (ms) | Total (ms) |', '| --- | ---: | ---: | ---: |'];
    for (const c of CORPUS) {
      const first = once(c);
      expect(first.kind).toBe(c.expect);
      const runs = [first];
      const n = first.decide + first.verify < 1000 ? 5 : 3;
      while (runs.length < n) runs.push(once(c));
      const d = median(runs.map(r => r.decide)), v = median(runs.map(r => r.verify));
      rows.push(`| ${c.id} | ${d.toFixed(1)} | ${v.toFixed(1)} | ${(d + v).toFixed(1)} |`);
    }
    console.log(`\nBENCH-TABLE\n${rows.join('\n')}\nBENCH-END`);
  }, 7_200_000);
});
