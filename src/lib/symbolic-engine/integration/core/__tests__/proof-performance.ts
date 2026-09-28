/** Opt-in serial benchmark. Run with Node 24; never part of timing-sensitive unit tests. */
import { registerHooks } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

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
const output = option('--output');
if (!output) throw new Error('--output is required');
const importCore = (file: string) => import(pathToFileURL(join(core, `${file}.ts`)).href);
const { ExecutionContext } = await importCore('execution') as typeof import('../execution');
const { FormalPrimitiveDomain } = await importCore('formal-primitive') as typeof import('../formal-primitive');
const { rational } = await importCore('rational') as typeof import('../rational');
const { integrateRational, verifyRationalDecision } = await importCore('rational-decision') as typeof import('../rational-decision');
const { encodeRationalDecision, decodeRationalDecision } = await importCore('rational-decision-wire') as typeof import('../rational-decision-wire');
const limits = { work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256 };
const fixtures: { name: string; n: number[]; d: number[] }[] = [
  { name: 'quintic', n: [1], d: [-1,-1,0,0,0,1] },
  { name: 'quintic-log', n: [-1,0,0,0,5], d: [-1,-1,0,0,0,1] },
  { name: 'quadratic', n: [1], d: [1,0,1] },
  { name: 'quartic', n: [1], d: [1,0,0,0,1] },
  { name: 'repeated-poles', n: [1], d: [1,0,2,0,1] },
  { name: 'repeated-residues', n: [0,1], d: [-1,0,1] },
  { name: 'degree-loss', n: [2,-8,3], d: [0,2,-3,1] },
];
// Fixed seed; independent derivative of a/(x-p)+b log(x-p)+x³/3.
let seed = 271828;
const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
for (let i = 0; i < 3; i++) {
  const p = next() % 5 - 2, a = next() % 7 + 1, b = next() % 5 + 1;
  fixtures.push({ name: `seeded-${i}`, n: [-a-b*p,b,p*p,-2*p,1], d: [p*p,-2*p,1] });
}
const selected = option('--cases').split(',').filter(Boolean), runs = Number(option('--runs', '3')), warmups = Number(option('--warmups', '1'));
if (!Number.isSafeInteger(runs) || runs < 1 || !Number.isSafeInteger(warmups) || warmups < 0) throw new Error('invalid run counts');
const artifactDir = option('--artifacts'); if (artifactDir) mkdirSync(artifactDir, { recursive: true });
type Sample = { ms: number; work: number; allocation: number; rss: number; heapUsed: number; maxRSSKiB: number };
type Operations = Record<string, Sample[]>;
const results: Record<string, Operations> = {};
function measure<T>(ctx: InstanceType<typeof ExecutionContext>, fn: () => T) {
  const before = ctx.usage, start = performance.now(), value = fn(), ms = performance.now() - start;
  const memory = process.memoryUsage();
  return { value, sample: { ms, work: ctx.usage.work-before.work, allocation: ctx.usage.allocation-before.allocation,
    rss: memory.rss, heapUsed: memory.heapUsed, maxRSSKiB: process.resourceUsage().maxRSS } };
}
const median = (samples: Sample[]) => [...samples].sort((a,b) => a.ms-b.ms)[Math.floor(samples.length/2)].ms;
for (const fixture of fixtures.filter(f => !selected.length || selected.includes(f.name))) {
  const samples: Operations = { integration: [], verification: [], encoding: [], decoding: [] };
  for (let iteration = -warmups; iteration < runs; iteration++) {
    const owner = new FormalPrimitiveDomain('x','z'), setup = new ExecutionContext(limits);
    const input = owner.fractions.make(setup, owner.x.make(setup, fixture.n.map(n => rational(setup,n))), owner.x.make(setup, fixture.d.map(n => rational(setup,n))));
    const integrationContext = new ExecutionContext(limits);
    const integration = measure(integrationContext, () => integrateRational(integrationContext, owner, input));
    // Each operation has a fresh context; setup and JSON parsing are outside its timer.
    const verifyContext = new ExecutionContext(limits);
    const verification = measure(verifyContext, () => verifyRationalDecision(verifyContext, owner, input, integration.value));
    const encodeContext = new ExecutionContext(limits);
    const encoding = measure(encodeContext, () => encodeRationalDecision(encodeContext, owner, integration.value));
    const wire = JSON.parse(JSON.stringify(encoding.value));
    const restoredOwner = new FormalPrimitiveDomain('x','z');
    const expected = restoredOwner.fractions.make(setup, restoredOwner.x.make(setup, fixture.n.map(n => rational(setup,n))), restoredOwner.x.make(setup, fixture.d.map(n => rational(setup,n))));
    const decodeContext = new ExecutionContext(limits);
    const decoding = measure(decodeContext, () => decodeRationalDecision(decodeContext, restoredOwner, expected, wire));
    if (iteration >= 0) {
      samples.integration.push(integration.sample); samples.verification.push(verification.sample); samples.encoding.push(encoding.sample); samples.decoding.push(decoding.sample);
    }
    if (artifactDir && iteration === 0) writeFileSync(join(artifactDir, `${fixture.name}.json`), JSON.stringify(wire));
    console.log(JSON.stringify({ case: fixture.name, iteration, ms: { integration: integration.sample.ms, verification: verification.sample.ms, encoding: encoding.sample.ms, decoding: decoding.sample.ms } }));
  }
  results[fixture.name] = samples;
  writeFileSync(output, JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch, limits, runs, warmups, results }, null, 2));
}
const compare = option('--compare');
if (compare) {
  const baseline = JSON.parse(readFileSync(compare,'utf8')) as { limits: typeof limits; results: typeof results; node: string; runs: number; warmups: number };
  if (JSON.stringify(baseline.limits) !== JSON.stringify(limits) || baseline.node !== process.version || baseline.runs !== runs || baseline.warmups !== warmups) throw new Error('incompatible benchmark conditions');
  const failures: string[] = [];
  for (const [name, operations] of Object.entries(results)) for (const [operation, samples] of Object.entries(operations)) {
    const before = median(baseline.results[name][operation]), after = median(samples), speedup = before / after;
    console.log(JSON.stringify({ name, operation, baselineMs: before, candidateMs: after, speedup }));
    if (name === 'quintic' && ['integration','verification'].includes(operation) ? speedup < 5 : after-before > Math.max(before*0.2,20)) failures.push(`${name}/${operation}`);
  }
  if (failures.length) throw new Error(`performance acceptance failed: ${failures.join(', ')}`);
}
