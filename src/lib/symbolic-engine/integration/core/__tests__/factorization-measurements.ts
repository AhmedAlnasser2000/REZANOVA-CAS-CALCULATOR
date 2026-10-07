/** Opt-in serial observations: node --experimental-strip-types <this-file> <output.json>. */
import { registerHooks } from 'node:module';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
registerHooks({resolve(specifier, context, nextResolve) {
  try {return nextResolve(specifier, context);} catch (error) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context); throw error;
  }
}});
const {setup, bounds} = await import('../differential-test-support');
const {ExecutionContext} = await import('../execution');
const {PolynomialRing} = await import('../polynomial');
const {DifferentialField} = await import('../differential-field');
const {factorRecursivePolynomial: factor, verifyRecursivePolynomialFactorization: verify} = await import('../recursive-polynomial-factorization');
const {encodeRecursivePolynomialFactorization: encode, decodeRecursivePolynomialFactorization: decode} = await import('../recursive-polynomial-factorization-wire');
const output = process.argv[2]; if (!output) throw Error('output path required');
const limits = setup().ctx.limits;
type Sample = {ms: number; work: number; allocation: number; rss: number; heapUsed: number};
const results: Record<string, Record<string, Sample[]>> = {}, construction: Record<string, Sample> = {};
const names = ['rationalQuartic', 'rationalRepeated', 'nonconstantLeading', 'nestedDenominators', 'depthEight'] as const;
function fixture(name: typeof names[number]) {
  const s = setup(), {ctx} = s; let owner = name.startsWith('rational') ? s.q : s.f;
  if (name === 'nestedDenominators') owner = DifferentialField.formal(ctx, owner, 't', [owner.fromInteger(ctx, 0n)], bounds);
  if (name === 'depthEight') {
    owner = s.q; for (let i = 0; i < 8; i++) owner = DifferentialField.formal(ctx, owner, `a${i}`, [owner.fromInteger(ctx, 0n)], bounds);
  }
  const ring = new PolynomialRing(owner, 'z'), one = owner.fromInteger(ctx, 1n), zero = owner.fromInteger(ctx, 0n);
  let input;
  if (name === 'rationalQuartic') input = ring.make(ctx, [one, zero, zero, zero, one]);
  else if (name === 'rationalRepeated') input = ring.multiply(ctx, ring.power(ctx, ring.make(ctx, [owner.fromInteger(ctx, -1n), owner.fromInteger(ctx, 2n)]), 3), ring.power(ctx, ring.make(ctx, [one, zero, one]), 2));
  else if (name === 'nonconstantLeading') input = ring.multiply(ctx, ring.make(ctx, [s.p([1, 1]), s.x]), ring.make(ctx, [s.f.negate(ctx, s.x), s.p([1, 1])]));
  else if (name === 'nestedDenominators') {
    const coefficient = owner.make(ctx, [s.p([1, 1]), s.p([1])], [s.p([0, 1]), s.p([1])]);
    input = ring.multiply(ctx, ring.make(ctx, [coefficient, one]), ring.make(ctx, [owner.add(ctx, owner.generator(ctx), owner.embed(ctx, s.x)), owner.embed(ctx, s.p([1, 1]))]));
  } else input = ring.make(ctx, [owner.negate(ctx, owner.generator(ctx)), zero, one]);
  return {ctx, ring, input};
}
function run<T>(name: string, operation: string, iteration: number, fn: (ctx: InstanceType<typeof ExecutionContext>) => T): T {
  const ctx = new ExecutionContext(limits), start = performance.now(), value = fn(ctx), ms = performance.now() - start;
  if (iteration >= 0) { results[name] ??= {}; results[name][operation] ??= []; const {rss, heapUsed} = process.memoryUsage();
    results[name][operation].push({ms, ...ctx.usage, rss, heapUsed}); } return value;
}
for (const name of names) {
  const start = performance.now(), s = fixture(name), elapsed = performance.now() - start, memory = process.memoryUsage();
  construction[name] = {ms: elapsed, ...s.ctx.usage, rss: memory.rss, heapUsed: memory.heapUsed};
  for (let iteration = -2; iteration < 5; iteration++) {
    const decision = run(name, 'factorization', iteration, ctx => factor(ctx, s.ring, s.input, bounds));
    run(name, 'verification', iteration, ctx => verify(ctx, s.ring, s.input, decision, bounds));
    const data = run(name, 'encoding', iteration, ctx => encode(ctx, s.ring, s.input, decision, bounds));
    const parsed = JSON.parse(JSON.stringify(data));
    run(name, 'decoding', iteration, ctx => decode(ctx, s.ring, s.input, parsed, bounds));
  }
  console.log(`Measured ${name}`);
}
writeFileSync(output, JSON.stringify({node: process.version, cpu: cpus()[0]?.model, warmups: 2, runs: 5,
  limits, bounds, construction, results}, null, 2) + '\n');
