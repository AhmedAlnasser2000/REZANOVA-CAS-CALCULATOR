/** Opt-in serial measurements: node --experimental-strip-types <this-file> <output.json>. */
import { registerHooks } from 'node:module';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context); throw error; }
} });
const { setup, bounds } = await import('../differential-test-support');
const { ExecutionContext } = await import('../execution');
const { solveRationalLimitedIntegration: solve, verifyRationalLimitedIntegration: verify } = await import('../rational-limited-integration');
const { encodeRationalLimitedIntegration: encode, decodeRationalLimitedIntegration: decode } = await import('../rational-limited-integration-wire');
const output = process.argv[2]; if (!output) throw Error('output path required');
type S = ReturnType<typeof setup>;
type Sample = { ms: number; work: number; allocation: number; rss: number; heapUsed: number };
const results: Record<string, Record<string, Sample[]>> = {};
const cases: Record<string, (s: S) => { input: S['x']; generators: S['x'][] }> = {
  emptyPolynomial: s => ({ input: s.p([2, 4, 6]), generators: [] }),
  unique: s => ({ input: s.p([1, 1], [0, 0, 1]), generators: [s.p([1], [0, 1])] }),
  dependent: s => ({ input: s.p([1], [0, 1]), generators: [s.p([1], [0, 1]), s.p([2], [0, 1]), s.p([]), s.p([0, 2])] }),
  mixedPoles: s => ({ input: s.f.add(s.ctx, s.p([1, 1], [0, 0, 1]), s.p([0, -2], [1, 0, 2, 0, 1])),
    generators: [s.p([1], [0, 1]), s.p([2], [0, 1]), s.p([1], [1, 0, 1])] }),
  impossible: s => ({ input: s.p([1], [-1, 1]), generators: [s.p([1], [0, 1]), s.p([1], [1, 0, 1])] }),
};
function run<T>(name: string, operation: string, iteration: number, s: S, fn: (ctx: InstanceType<typeof ExecutionContext>) => T): T {
  const ctx = new ExecutionContext(s.ctx.limits), start = performance.now(), value = fn(ctx), ms = performance.now() - start;
  if (iteration >= 0) {
    results[name] ??= {}; results[name][operation] ??= [];
    const { rss, heapUsed } = process.memoryUsage(); results[name][operation].push({ ms, ...ctx.usage, rss, heapUsed });
  }
  return value;
}
for (const [name, fixture] of Object.entries(cases)) {
  for (let iteration = -2; iteration < 5; iteration++) {
    const s = setup(), { input, generators } = fixture(s);
    const decision = run(name, 'solving', iteration, s, ctx => solve(ctx, s.f, input, generators));
    run(name, 'verification', iteration, s, ctx => verify(ctx, s.f, input, generators, decision));
    const artifact = run(name, 'encoding', iteration, s, ctx => encode(ctx, s.f, input, generators, decision, bounds));
    const parsed = JSON.parse(JSON.stringify(artifact)), fresh = setup(), expected = fixture(fresh);
    run(name, 'decoding', iteration, fresh, ctx => decode(ctx, fresh.f, expected.input, expected.generators, parsed, bounds));
  }
  console.log(`Measured ${name}`);
}
writeFileSync(output, JSON.stringify({ node: process.version, cpu: cpus()[0]?.model, warmups: 2, runs: 5,
  limits: setup().ctx.limits, bounds, results }, null, 2) + '\n');
