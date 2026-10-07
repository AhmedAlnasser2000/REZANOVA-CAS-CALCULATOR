/** Opt-in: node --experimental-strip-types <this-file> <output.json>. */
import { registerHooks } from 'node:module';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context); throw error; }
} });
const { logarithmicSetup } = await import('./logarithmic-rational-fixtures');
const { bounds } = await import('../differential-test-support');
const { ExecutionContext } = await import('../execution');
const { integrateLogarithmicRational: solve, verifyLogarithmicRationalDecision: verify } = await import('../logarithmic-rational-decision');
const { encodeLogarithmicRationalDecision: encode, decodeLogarithmicRationalDecision: decode } = await import('../logarithmic-rational-wire');
const output = process.argv[2]; if (!output) throw Error('output path required');
type S = ReturnType<typeof logarithmicSetup>;
type Sample = { ms: number; work: number; allocation: number; rss: number; heapUsed: number };
const results: Record<string, Record<string, Sample[]>> = {};
const cases: Record<string, (s: S) => S['x']> = {
  polynomial: s => s.v([0, 0, 1]),
  extraDegree: s => s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), s.t),
  repeatedPole: s => s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), s.v([1], [0, 0, 1])),
  algebraicResidues: s => s.F.multiply(s.ctx, s.F.embed(s.ctx, s.a), s.v([1], [2, 0, 1])),
  nonconstantResidue: s => s.v([1], [0, 1]),
  polynomialObstruction: s => s.F.multiply(s.ctx, s.F.embed(s.ctx, s.p([1], [1, 1])), s.t),
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
    const s = logarithmicSetup(), input = fixture(s);
    const decision = run(name, 'solving', iteration, s, ctx => solve(ctx, s.F, input, bounds));
    run(name, 'verification', iteration, s, ctx => verify(ctx, s.F, input, decision, bounds));
    const artifact = run(name, 'encoding', iteration, s, ctx => encode(ctx, s.F, input, decision, bounds));
    const parsed = JSON.parse(JSON.stringify(artifact)), fresh = logarithmicSetup(), expected = fixture(fresh);
    run(name, 'decoding', iteration, fresh, ctx => decode(ctx, fresh.F, expected, parsed, bounds));
  }
  console.log(`Measured ${name}`);
}
writeFileSync(output, JSON.stringify({ node: process.version, cpu: cpus()[0]?.model, warmups: 2, runs: 5,
  limits: logarithmicSetup().ctx.limits, bounds, results }, null, 2) + '\n');
