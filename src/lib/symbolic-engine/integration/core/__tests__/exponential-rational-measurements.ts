/** Opt-in serial observations. No application limits or timing assertions. */
import { registerHooks } from 'node:module';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context); throw error; }
} });
const { exponentialSetup } = await import('./exponential-rational-fixtures');
const { bounds } = await import('../differential-test-support');
const { ExecutionContext } = await import('../execution');
const { ExponentialRationalDomain } = await import('../exponential-rational-domain');
const { exponentialLogTerm, exponentialPrimitive, differentiateExponentialPrimitive, verifyExponentialPrimitive } = await import('../exponential-rational-primitive');
const { exponentialConditions } = await import('../exponential-rational-conditions');
const { encodeExponentialRationalPrimitive, decodeExponentialRationalPrimitive } = await import('../exponential-rational-primitive-wire');
const { integrateExponentialRational, verifyExponentialRationalDecision } = await import('../exponential-rational-decision');
const { encodeExponentialRationalDecision, decodeExponentialRationalDecision } = await import('../exponential-rational-wire');
const output = process.argv[2]; if (!output) throw Error('output path required');
type S = ReturnType<typeof exponentialSetup>;
type Sample = { ms: number; work: number; allocation: number; rss: number; heapUsed: number };
const results: Record<string, Record<string, Sample[]>> = {};
const cases: Record<string, (s: S) => S['t']> = {
  affine: s => s.v([1], [1, 1]), repeated: s => s.v([1], [1, 2, 1]),
  algebraicResidues: s => s.v([0, 1], [1, 0, 1]),
  nonconstantResidue: s => s.F.make(s.ctx, [s.c(1)], [s.x, s.c(1)]),
  laurentObstruction: s => s.F.add(s.ctx, s.v([1], [1, 1]), s.F.multiply(s.ctx, s.F.embed(s.ctx, s.p([1], [0, 1])), s.t)),
  rebasedLaurent: s => s.v([1, 0, 0, 0, 1], [0, 0, 1]),
  rationalRootLogs: s => s.F.embed(s.ctx, s.p([1], [1, 0, 1])),
};
function run<T>(name: string, operation: string, iteration: number, s: S, fn: (ctx: InstanceType<typeof ExecutionContext>) => T): T {
  const ctx = new ExecutionContext(s.ctx.limits), start = performance.now(), value = fn(ctx), ms = performance.now() - start;
  if (iteration >= 0) {
    results[name] ??= {}; results[name][operation] ??= [];
    const { rss, heapUsed } = process.memoryUsage(); results[name][operation].push({ ms, ...ctx.usage, rss, heapUsed });
  }
  return value;
}
for (let iteration = -1; iteration < 3; iteration++) {
  const s = exponentialSetup(), d = new ExponentialRationalDomain(s.ctx, s.F, bounds), g = s.F.add(s.ctx, s.t, s.F.embed(s.ctx, s.x));
  const target = s.F.exactDivide(s.ctx, s.F.add(s.ctx, s.t, s.F.fromInteger(s.ctx, 1n)), g);
  const saved = run('primitive', 'construction', iteration, s, ctx => {
    const term = exponentialLogTerm(ctx, d, d.z.make(ctx, [d.z.domain.fromInteger(ctx, 0n), d.z.domain.fromInteger(ctx, 1n)]), d.z.one(ctx), d.fz.constant(ctx, g));
    const primitive = exponentialPrimitive(ctx, d, s.F.fromInteger(ctx, 0n), [term]), derivative = differentiateExponentialPrimitive(ctx, primitive, bounds);
    verifyExponentialPrimitive(ctx, primitive, target, derivative, bounds);
    return { primitive, derivative, conditions: exponentialConditions(ctx, d, target, primitive) };
  });
  run('primitive', 'verification', iteration, s, ctx => verifyExponentialPrimitive(ctx, saved.primitive, target, saved.derivative, bounds));
  const artifact = run('primitive', 'encoding', iteration, s, ctx => encodeExponentialRationalPrimitive(ctx, s.F, target, saved, bounds));
  const parsed = JSON.parse(JSON.stringify(artifact));
  run('primitive', 'decoding', iteration, s, ctx => decodeExponentialRationalPrimitive(ctx, s.F, target, parsed, bounds));
}
for (const [name, fixture] of Object.entries(cases)) {
  for (let iteration = -1; iteration < 3; iteration++) {
    const s = exponentialSetup(), input = fixture(s);
    const decision = run(name, 'construction', iteration, s, ctx => integrateExponentialRational(ctx, s.F, input, bounds));
    run(name, 'verification', iteration, s, ctx => verifyExponentialRationalDecision(ctx, s.F, input, decision, bounds));
    const artifact = run(name, 'encoding', iteration, s, ctx => encodeExponentialRationalDecision(ctx, s.F, input, decision, bounds));
    const parsed = JSON.parse(JSON.stringify(artifact)), fresh = exponentialSetup(), expected = fixture(fresh);
    run(name, 'decoding', iteration, fresh, ctx => decodeExponentialRationalDecision(ctx, fresh.F, expected, parsed, bounds));
  }
  console.log(`Measured ${name}`);
}
writeFileSync(output, JSON.stringify({ node: process.version, cpu: cpus()[0]?.model, warmups: 1, runs: 3,
  limits: exponentialSetup().ctx.limits, bounds, results }, null, 2));
