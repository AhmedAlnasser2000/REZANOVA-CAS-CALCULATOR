/** Opt-in serial measurements: node --experimental-strip-types <this-file> <output.json>. */
import { registerHooks } from 'node:module';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
registerHooks({resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context); throw error; }
}});
const {setup, bounds} = await import('../differential-test-support');
const {ExecutionContext} = await import('../execution');
const {DifferentialField} = await import('../differential-field');
const {CertifiedTowerView} = await import('../recursive-certified-tower');
const admission = await import('../recursive-differential-admission');
const rde = await import('../recursive-rde');
const limited = await import('../recursive-limited-integration');
const relations = await import('../recursive-logarithmic-relations');
const wire = await import('../recursive-rde-wire');
const relationWire = await import('../recursive-logarithmic-relations-wire');
const admissionWire = await import('../recursive-differential-admission-wire');
type Ctx = InstanceType<typeof ExecutionContext>;
type S = ReturnType<typeof setup>;
type View = import('../recursive-certified-tower').CertifiedTowerView;
type Sample = {ms: number; work: number; allocation: number; rss: number; heapUsed: number};
type Operations = {solve(ctx: Ctx): unknown; verify(ctx: Ctx): void; encode(ctx: Ctx): unknown; decode(ctx: Ctx, data: unknown): unknown};
const output = process.argv[2]; if (!output) throw Error('output path required');
const results: Record<string, Record<string, Sample[]>> = {}, bytes: Record<string, number> = {};
function extend(s: S, parent: View, primitive: boolean, eta: S['x'], variable: string): View {
  const owner = DifferentialField.formal(s.ctx, parent.owner, variable, primitive ? [eta] : [parent.owner.fromInteger(s.ctx, 0n), eta], bounds);
  const e = admission.certifyRecursiveDifferentialExtension(s.ctx, parent, owner, {kind: primitive ? 'primitive' : 'hyperexponential', integrand: eta}, bounds);
  if (e.kind !== 'admitted') throw Error('independent measurement construction'); return e.view;
}
function fixture(s: S, name: string): Operations {
  let view = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds);
  if (name !== 'rationalFamily') view = extend(s, view, name.startsWith('log'), name.startsWith('log') ? s.p([1], [0, 1]) : s.p([1]), 't');
  if (name === 'mixedRelations') view = extend(s, view, true, view.owner.embed(s.ctx, s.p([1], [0, 1])), 'u');
  if (name === 'heightFour') for (let k = 2; k <= 3; k++) {
    const cs = Array(k).fill(0); cs[k - 1] = k; view = extend(s, view, false, view.owner.embed(s.ctx, s.p(cs)), `t${k}`);
  }
  const o = view.owner, zero = o.fromInteger(s.ctx, 0n), one = o.fromInteger(s.ctx, 1n), t = o.generator(s.ctx);
  if (name === 'dependentAdmission') {
    const rate = o.exactDivide(s.ctx, one, o.fromInteger(s.ctx, 2n)), construction = {kind: 'hyperexponential' as const, integrand: rate};
    const extension = DifferentialField.formal(s.ctx, o, 'u', [zero, rate], bounds); let e: ReturnType<typeof admission.certifyRecursiveDifferentialExtension>;
    return {solve: ctx => e = admission.certifyRecursiveDifferentialExtension(ctx, view, extension, construction, bounds),
      verify: ctx => admission.verifyRecursiveDifferentialExtension(ctx, view, extension, construction, e, bounds),
      encode: ctx => admissionWire.encodeRecursiveDifferentialAdmission(ctx, view, extension, construction, e, bounds),
      decode: (ctx, data) => admissionWire.decodeRecursiveDifferentialAdmission(ctx, view, extension, construction, data, bounds)};
  }
  if (name === 'mixedRelations') {
    const inputs = [one, o.embed(s.ctx, s.p([0, 2])), o.embed(s.ctx, s.p([1], [0, 1]))]; let e: ReturnType<typeof relations.solveRecursiveLogarithmicDerivativeRelations>;
    return {solve: ctx => e = relations.solveRecursiveLogarithmicDerivativeRelations(ctx, view, inputs, bounds),
      verify: ctx => relations.verifyRecursiveLogarithmicDerivativeRelations(ctx, view, inputs, e, bounds),
      encode: ctx => relationWire.encodeRecursiveLogarithmicDerivativeRelations(ctx, view, inputs, e, bounds),
      decode: (ctx, data) => relationWire.decodeRecursiveLogarithmicDerivativeRelations(ctx, view, inputs, data, bounds)};
  }
  if (name === 'rationalFamily' || name === 'hyperFamily') {
    const a = name === 'rationalFamily' ? zero : o.negate(s.ctx, one), forcing = [name === 'rationalFamily' ? one : t]; let e: ReturnType<typeof rde.solveRecursiveParametricRde>;
    return {solve: ctx => e = rde.solveRecursiveParametricRde(ctx, view, a, zero, forcing, bounds),
      verify: ctx => rde.verifyRecursiveParametricRde(ctx, view, a, zero, forcing, e, bounds),
      encode: ctx => wire.encodeRecursiveParametricRde(ctx, view, a, zero, forcing, e, bounds),
      decode: (ctx, data) => wire.decodeRecursiveParametricRde(ctx, view, a, zero, forcing, data, bounds)};
  }
  const x = o.embed(s.ctx, s.x), input = name === 'logPositive' ? o.exactDivide(s.ctx, t, x) : name === 'logNegative' ? o.inverse(s.ctx, o.multiply(s.ctx, x, t)) : one;
  let e: ReturnType<typeof limited.solveRecursiveLimitedIntegration>;
  return {solve: ctx => e = limited.solveRecursiveLimitedIntegration(ctx, view, input, [], bounds),
    verify: ctx => limited.verifyRecursiveLimitedIntegration(ctx, view, input, [], e, bounds),
    encode: ctx => wire.encodeRecursiveLimitedIntegration(ctx, view, input, [], e, bounds),
    decode: (ctx, data) => wire.decodeRecursiveLimitedIntegration(ctx, view, input, [], data, bounds)};
}
function run<T>(name: string, operation: string, iteration: number, ctx: Ctx, fn: () => T): T {
  const before = ctx.usage, start = performance.now(), value = fn(), ms = performance.now() - start;
  if (iteration >= 0) {
    results[name] ??= {}; results[name][operation] ??= []; const {rss, heapUsed} = process.memoryUsage();
    results[name][operation].push({ms, work: ctx.usage.work - before.work, allocation: ctx.usage.allocation - before.allocation, rss, heapUsed});
  }
  return value;
}
for (const name of ['rationalFamily', 'hyperFamily', 'logPositive', 'logNegative', 'mixedRelations', 'dependentAdmission', 'heightFour']) {
  for (let iteration = -2; iteration < 5; iteration++) {
    const s = setup(), ops = run(name, 'construction', iteration, s.ctx, () => fixture(s, name));
    const solveCtx = new ExecutionContext(s.ctx.limits); run(name, 'solving', iteration, solveCtx, () => ops.solve(solveCtx));
    const verifyCtx = new ExecutionContext(s.ctx.limits); run(name, 'verification', iteration, verifyCtx, () => ops.verify(verifyCtx));
    const encodeCtx = new ExecutionContext(s.ctx.limits), data = run(name, 'encoding', iteration, encodeCtx, () => ops.encode(encodeCtx));
    const text = JSON.stringify(data); bytes[name] = Buffer.byteLength(text); const parsed = JSON.parse(text), decodeCtx = new ExecutionContext(s.ctx.limits);
    run(name, 'decoding', iteration, decodeCtx, () => ops.decode(decodeCtx, parsed));
  }
  console.log(`Measured ${name}`);
}
writeFileSync(output, JSON.stringify({node: process.version, cpu: cpus()[0]?.model, warmups: 2, runs: 5, limits: setup().ctx.limits, bounds, bytes, results}, null, 2) + '\n');
