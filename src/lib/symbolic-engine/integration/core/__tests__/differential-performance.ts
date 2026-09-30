/** Opt-in serial benchmark; Node 24. Timings never run as unit-test assertions. */
import { registerHooks } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cpus, hostname } from 'node:os';

registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const args = process.argv.slice(2);
function option(name: string, fallback = '') { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; }
const core = resolve(option('--core', 'src/lib/symbolic-engine/integration/core'));
const output = option('--output'); if (!output) throw new Error('--output required');
const load = (file: string) => import(pathToFileURL(join(core, `${file}.ts`)).href);
const { ExecutionContext } = await load('execution') as typeof import('../execution');
const { setup, bounds } = await load('differential-test-support') as typeof import('../differential-test-support');
const { DifferentialField: DF } = await load('differential-field') as typeof import('../differential-field');
const { buildExponential, buildLogarithm } = await load('differential-admission') as typeof import('../differential-admission');
const { differentiate, verifyDerivative } = await load('differential-derivative') as typeof import('../differential-derivative');
const { integrateHyperexponential, verifyHyperexponentialDecision } = await load('hyperexponential-decision') as typeof import('../hyperexponential-decision');
const { encodeHyperexponentialDecision, decodeHyperexponentialDecision } = await load('hyperexponential-wire') as typeof import('../hyperexponential-wire');
const { FormalPrimitiveDomain } = await load('formal-primitive') as typeof import('../formal-primitive');
const { rational } = await load('rational') as typeof import('../rational');
const { integrateRational, verifyRationalDecision } = await load('rational-decision') as typeof import('../rational-decision');
const { encodeRationalDecision, decodeRationalDecision } = await load('rational-decision-wire') as typeof import('../rational-decision-wire');
const limits = { work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256 };
const runs = Number(option('--runs', '5')), warmups = Number(option('--warmups', '2'));
if (!Number.isSafeInteger(runs) || runs < 1 || !Number.isSafeInteger(warmups) || warmups < 0) throw new Error('invalid run counts');
const selected = option('--cases').split(',').filter(Boolean), artifacts = option('--artifacts');
if (artifacts) mkdirSync(artifacts, { recursive: true });
type Ctx = InstanceType<typeof ExecutionContext>;
type Sample = { ms: number; work: number; allocation: number; rss: number; heapUsed: number; maxRSSKiB: number };
const results: Record<string, Record<string, Sample[]>> = {};
const wanted = (name: string) => !selected.length || selected.includes(name);
function measure<T>(name: string, operation: string, iteration: number, fn: (ctx: Ctx) => T): T {
  const ctx = new ExecutionContext(limits), start = performance.now(), value = fn(ctx), ms = performance.now() - start;
  const memory = process.memoryUsage();
  if (iteration >= 0) {
    results[name] ??= {}; results[name][operation] ??= [];
    results[name][operation].push({ ms, ...ctx.usage, rss: memory.rss, heapUsed: memory.heapUsed, maxRSSKiB: process.resourceUsage().maxRSS });
  }
  console.log(JSON.stringify({ name, operation, iteration, ms })); return value;
}
const machine = { host: hostname(), cpu: cpus()[0]?.model, logicalCpus: cpus().length };
function save() { writeFileSync(output, JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch, machine, limits, bounds, runs, warmups, results }, null, 2)); }
const hyper = [
  { name: 'exp-x', b: [1], r: [0, 1] },
  { name: 'exp-minus-x', b: [1], r: [0, -1] },
  { name: 'shifted', b: [1], r: [1, 1] },
  { name: 'shifted-negative', b: [1], r: [-1, -1] },
  { name: '2x-exp-x2', b: [0, 2], r: [0, 0, 1] },
  { name: 'inverse-x-positive', b: [-1], bd: [0, 0, 1], r: [1], rd: [0, 1] },
  { name: 'zero', b: [], r: [1], rd: [0, 1] },
  { name: 'rational-coefficient', b: [-1, 1], bd: [0, 0, 1], r: [0, 1] },
  { name: 'negative-exp-x2', b: [1], r: [0, 0, 1] },
  { name: 'negative-exp-x-over-x', b: [1], bd: [0, 1], r: [0, 1] },
  { name: 'negative-exp-inverse-x', b: [1], r: [1], rd: [0, 1] },
];
for (const v of hyper.filter(v => wanted(v.name))) {
  for (let i = -warmups; i < runs; i++) {
    const s = setup(), b = s.p(v.b, v.bd), r = s.p(v.r, v.rd);
    const d = measure(v.name, 'integration', i, c => integrateHyperexponential(c, s.f, b, r, bounds));
    if (d.kind === 'unsupported') throw new Error('fixture unsupported');
    measure(v.name, 'verification', i, c => verifyHyperexponentialDecision(c, s.f, b, r, d));
    const wire = JSON.parse(JSON.stringify(measure(v.name, 'encoding', i, c => encodeHyperexponentialDecision(c, s.f, b, r, d, bounds))));
    const fresh = setup(), expectedB = fresh.p(v.b, v.bd), expectedR = fresh.p(v.r, v.rd);
    measure(v.name, 'decoding', i, c => decodeHyperexponentialDecision(c, fresh.f, expectedB, expectedR, wire, bounds));
    if (artifacts && i === 0) writeFileSync(join(artifacts, `${v.name}.json`), JSON.stringify(wire));
  }
  save();
}
for (const name of ['power-positive', 'power-negative', 'mixed-laurent', 'logarithmic', 'tower-five'].filter(wanted)) {
  for (let i = -warmups; i < runs; i++) {
    const s = setup(), c = s.ctx;
    const admitted = name === 'logarithmic' ? buildLogarithm(c, s.f, 't', s.x, bounds) : buildExponential(c, s.f, 't', [s.x], bounds);
    if (admitted.status !== 'supported') throw new Error('fixture');
    let owner = admitted.field;
    const zero = s.p([]), one = s.p([1]);
    let value = owner.make(c, [zero, zero, zero, one]);
    if (name === 'power-negative') value = owner.inverse(c, value);
    if (name === 'mixed-laurent') value = owner.add(c, value, owner.make(c, [s.x, one], [zero, zero, one]));
    if (name === 'logarithmic') value = owner.multiply(c, owner.embed(c, s.x), value);
    if (name === 'tower-five') {
      owner = DF.formal(c, s.f, 't', [one], bounds);
      value = owner.multiply(c, owner.embed(c, s.x), owner.generator(c));
      for (let j = 0; j < 3; j++) {
        const next = DF.formal(c, owner, `u_${j}`, [owner.fromInteger(c, 0n)], bounds);
        value = next.multiply(c, next.embed(c, value), next.generator(c)); owner = next;
      }
    }
    const evidence = measure(name, 'differentiation', i, c => differentiate(c, owner, value));
    measure(name, 'verification', i, c => verifyDerivative(c, owner, value, evidence));
  }
  save();
}
const rationals = [
  { name: 'rational-quintic', n: [1], d: [-1,-1,0,0,0,1] },
  { name: 'rational-quintic-log', n: [-1,0,0,0,5], d: [-1,-1,0,0,0,1] },
  { name: 'rational-quadratic', n: [1], d: [1,0,1] },
  { name: 'rational-quartic', n: [1], d: [1,0,0,0,1] },
  { name: 'rational-repeated-poles', n: [1], d: [1,0,2,0,1] },
  { name: 'rational-repeated-residues', n: [0,1], d: [-1,0,1] },
  { name: 'rational-degree-loss', n: [2,-8,3], d: [0,2,-3,1] },
];
let seed = 271828;
const next = () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed; };
for (let i = 0; i < 3; i++) {
  const p = next()%5-2, a = next()%7+1, b = next()%5+1;
  rationals.push({ name: `rational-seeded-${i}`, n: [-a-b*p,b,p*p,-2*p,1], d: [p*p,-2*p,1] });
}
for (const v of rationals.filter(v => wanted(v.name))) {
  for (let i = -warmups; i < runs; i++) {
    const c = new ExecutionContext(limits), owner = new FormalPrimitiveDomain('x','z');
    const input = owner.fractions.make(c, owner.x.make(c, v.n.map(n => rational(c,n))), owner.x.make(c, v.d.map(n => rational(c,n))));
    const d = measure(v.name, 'integration', i, c => integrateRational(c, owner, input));
    measure(v.name, 'verification', i, c => verifyRationalDecision(c, owner, input, d));
    const wire = JSON.parse(JSON.stringify(measure(v.name, 'encoding', i, c => encodeRationalDecision(c, owner, d))));
    const fresh = new FormalPrimitiveDomain('x','z');
    const expected = fresh.fractions.make(c, fresh.x.make(c, v.n.map(n => rational(c,n))), fresh.x.make(c, v.d.map(n => rational(c,n))));
    measure(v.name, 'decoding', i, c => decodeRationalDecision(c, fresh, expected, wire));
  }
  save();
}
if (!Object.keys(results).length) throw new Error('no selected cases');
if (option('--compare')) {
  const baseline = JSON.parse(readFileSync(option('--compare'),'utf8'));
  if (baseline.node !== process.version || baseline.runs !== runs || baseline.warmups !== warmups
    || baseline.platform !== process.platform || baseline.arch !== process.arch || JSON.stringify(baseline.machine) !== JSON.stringify(machine)
    || JSON.stringify(baseline.limits) !== JSON.stringify(limits) || JSON.stringify(baseline.bounds) !== JSON.stringify(bounds)) throw new Error('incompatible baseline');
  if (!selected.length && JSON.stringify(Object.keys(baseline.results)) !== JSON.stringify(Object.keys(results))) throw new Error('incomplete corpus');
  const median = (xs: Sample[]) => xs.map(s => s.ms).sort((a,b) => a-b)[Math.floor(xs.length/2)];
  const failures: string[] = [];
  for (const [name, operations] of Object.entries(results)) for (const [operation, samples] of Object.entries(operations)) {
    const before = median(baseline.results[name][operation]), after = median(samples), speedup = before/after;
    console.log(JSON.stringify({ name, operation, baselineMs: before, candidateMs: after, speedup }));
    const target = name === 'exp-minus-x' && ['integration','verification'].includes(operation);
    if (target ? speedup < 5 : after-before > Math.max(before*0.2,20)) failures.push(`${name}/${operation}`);
  }
  if (failures.length) throw new Error(`performance acceptance failed: ${failures.join(', ')}`);
}
