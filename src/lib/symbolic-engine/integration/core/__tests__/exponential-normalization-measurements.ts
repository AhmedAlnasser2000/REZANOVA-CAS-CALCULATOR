/** Opt-in serial observations; no timing-sensitive assertions or product defaults. */
import { registerHooks } from 'node:module';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import type { ExponentialExpression as X } from '../exponential-normalization-types';
registerHooks({resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context); throw error; }
}});
const { ExecutionContext } = await import('../execution');
const { DifferentialField } = await import('../differential-field');
const { normalizeExponentialExpression, verifyExponentialNormalization } = await import('../exponential-normalization');
const { encodeExponentialNormalization, decodeExponentialNormalization } = await import('../exponential-normalization-wire');
const bounds = {towerHeight: 8, artifactDepth: 64, artifactNodes: 100_000, artifactBytes: 16 * 1024 * 1024};
const limits = {work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256};
const output = process.argv[2]; if (!output) throw Error('output path required');
const setup = new ExecutionContext(limits), q = DifferentialField.rationals(setup, bounds), owner = DifferentialField.rationalFunctions(setup, q, 'x', bounds);
const x = owner.generator(setup), one = owner.fromInteger(setup, 1n);
const a: X = {kind: 'exponential', value: x}, b: X = {kind: 'exponential', value: owner.multiply(setup, x, x)};
const c: X = {kind: 'exponential', value: owner.multiply(setup, owner.multiply(setup, x, x), x)};
const add = (left: X, right: X): X => ({kind: 'add', left, right});
const mul = (left: X, right: X): X => ({kind: 'multiply', left, right});
const div = (left: X, right: X): X => ({kind: 'divide', left, right});
const cases: Record<string, X> = {
  twoFamily: div(add(add(mul(a, a), a), add(mul(a, b), b)), add(a, b)),
  threeFamily: div(add(add(mul(a, a), mul(a, b)), mul(a, c)), add(add(a, b), c)),
  shifted: add({kind: 'exponential', value: owner.add(setup, x, one)}, {kind: 'exponential', value: owner.multiply(setup, owner.add(setup, x, one), owner.fromInteger(setup, 2n))}),
  canceledRationalArgument: {kind: 'subtract', left: {kind: 'exponential', value: owner.inverse(setup, x)}, right: {kind: 'exponential', value: owner.inverse(setup, x)}},
};
type Sample = {ms: number; work: number; allocation: number; rss: number; heapUsed: number};
const results: Record<string, Record<string, Sample[]>> = {};
for (const [name, expression] of Object.entries(cases)) {
  const input = {expression, restrictions: []}; results[name] = {};
  for (let iteration = -1; iteration < 3; iteration++) {
    function measure<T>(operation: string, fn: (ctx: InstanceType<typeof ExecutionContext>) => T): T {
      const ctx = new ExecutionContext(limits), start = performance.now(), value = fn(ctx), ms = performance.now() - start;
      if (iteration >= 0) {
        const {rss, heapUsed} = process.memoryUsage(); (results[name][operation] ??= []).push({ms, ...ctx.usage, rss, heapUsed});
      }
      return value;
    }
    const proof = measure('construction', ctx => normalizeExponentialExpression(ctx, owner, input, bounds));
    measure('verification', ctx => verifyExponentialNormalization(ctx, owner, input, proof, bounds));
    const artifact = measure('encoding', ctx => encodeExponentialNormalization(ctx, owner, input, proof, bounds));
    const parsed = JSON.parse(JSON.stringify(artifact));
    measure('decoding', ctx => decodeExponentialNormalization(ctx, owner, input, parsed, bounds));
  }
}
writeFileSync(output, JSON.stringify({node: process.version, cpu: cpus()[0]?.model, limits, bounds,
  policy: 'one warm-up and three serial measured runs; fresh contexts; fixture construction, JSON parsing and I/O excluded; allocation is cumulative accounting, RSS/heap are bytes', results}, null, 2));
for (const [name, operations] of Object.entries(results)) for (const [operation, samples] of Object.entries(operations)) {
  const sorted = [...samples].sort((a, b) => a.ms - b.ms), median = sorted[1];
  console.log(name, operation, JSON.stringify({medianMs: median.ms, minMs: sorted[0].ms, maxMs: sorted[2].ms, work: median.work, allocation: median.allocation}));
}
