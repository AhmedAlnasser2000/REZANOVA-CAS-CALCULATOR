/** Opt-in serial observations, not a timing-sensitive test or application default. */
import { registerHooks } from 'node:module';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import type { ExponentialSumInput } from '../exponential-sum-types';

registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { setup, bounds } = await import('../differential-test-support');
const { ExecutionContext } = await import('../execution');
const { normalizeSum } = await import('../exponential-sum-normalization');
const { integrateExponentialSum, verifyExponentialSumDecision } = await import('../exponential-sum-decision');
const { encodeExponentialSumDecision, decodeExponentialSumDecision } = await import('../exponential-sum-wire');
const output = process.argv[2]; if (!output) throw new Error('output path required');
type Fixture = ReturnType<typeof setup>;
const cases: Record<string, (s: Fixture) => ExponentialSumInput> = {
  zero: s => ({ rationalPart: s.p([]), terms: [] }),
  rational: s => ({ rationalPart: s.p([1], [1, 0, 1]), terms: [] }),
  mixed: s => ({ rationalPart: s.p([1], [1, 0, 1]), terms: [
    { coefficient: s.p([1]), argument: s.x }, { coefficient: s.p([1]), argument: s.p([0, -1]) },
    { coefficient: s.p([1]), argument: s.p([0, 1], [2]) }] }),
  shifted: s => ({ rationalPart: s.p([2]), terms: [
    { coefficient: s.p([1]), argument: s.p([1, 1]) }, { coefficient: s.p([2]), argument: s.p([2, 2]) }] }),
  rationalExponent: s => ({ rationalPart: s.p([]), terms: [
    { coefficient: s.p([-1], [0, 0, 1]), argument: s.p([1], [0, 1]) },
    { coefficient: s.p([2], [0, 0, 1]), argument: s.p([-2], [0, 1]) }] }),
  canceled: s => ({ rationalPart: s.p([]), terms: Array.from({ length: 32 }, (_, i) => ({
    coefficient: s.p([i % 2 ? -1 : 1], [-1, 1]), argument: s.p([0, 0, 1]) })) }),
  firstObstruction: s => ({ rationalPart: s.p([1], [-1, -1, 0, 0, 0, 1]), terms: [
    { coefficient: s.p([1]), argument: s.p([0, 0, -1]) }, { coefficient: s.p([0, 2]), argument: s.p([0, 0, 1]) }] }),
  laterObstruction: s => ({ rationalPart: s.p([1], [1, 0, 1]), terms: [
    { coefficient: s.p([1]), argument: s.x }, { coefficient: s.p([1], [0, 1]), argument: s.p([0, 2]) },
    { coefficient: s.p([3]), argument: s.p([0, 3]) }] }),
};
const results: Record<string, Record<string, { ms: number; work: number; allocation: number; rss: number; heapUsed: number }[]>> = {};
for (const [name, fixture] of Object.entries(cases)) {
  for (let iteration = -1; iteration < 3; iteration++) {
    const s = setup(), input = fixture(s);
    const run = <T>(operation: string, fn: (ctx: InstanceType<typeof ExecutionContext>) => T): T => {
      const ctx = new ExecutionContext(s.ctx.limits), start = performance.now(), value = fn(ctx), ms = performance.now() - start;
      if (iteration >= 0) {
        results[name] ??= {}; results[name][operation] ??= [];
        const { rss, heapUsed } = process.memoryUsage(); results[name][operation].push({ ms, ...ctx.usage, rss, heapUsed });
      }
      return value;
    };
    run('normalization', c => c.operation(() => normalizeSum(c, s.f, input)));
    const decision = run('integration', c => integrateExponentialSum(c, s.f, input, bounds));
    if (decision.kind === 'unsupported') throw new Error(`unsupported fixture ${name}`);
    run('verification', c => verifyExponentialSumDecision(c, s.f, input, decision, bounds));
    const wire = run('encoding', c => encodeExponentialSumDecision(c, s.f, input, decision, bounds));
    const parsed = JSON.parse(JSON.stringify(wire)), fresh = setup(), expected = fixture(fresh);
    run('decoding', c => decodeExponentialSumDecision(c, fresh.f, expected, parsed, bounds));
  }
}
writeFileSync(output, JSON.stringify({ node: process.version, cpu: cpus()[0]?.model, warmups: 1, runs: 3,
  limits: setup().ctx.limits, bounds, results }, null, 2));
console.log(`Measured ${Object.keys(cases).length} cases, five operations, serially.`);
