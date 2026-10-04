/** Opt-in, serial baseline/candidate benchmark. Node 24; no timing-sensitive unit tests. */
import { registerHooks } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cpus, hostname } from 'node:os';
import { createHash } from 'node:crypto';
registerHooks({ resolve(s, c, next) {
  try { return next(s, c); } catch (e) { if (s.startsWith('.') && !s.endsWith('.ts')) return next(`${s}.ts`, c); throw e; }
} });
const args = process.argv.slice(2);
const option = (s: string, fallback = '') => { const i = args.indexOf(s); return i < 0 ? fallback : args[i + 1]; };
const core = resolve(option('--core', 'src/lib/symbolic-engine/integration/core'));
const load = (s: string) => import(pathToFileURL(join(core, `${s}.ts`)).href);
const { exponentialSetup } = await load('__tests__/exponential-rational-fixtures') as typeof import('./exponential-rational-fixtures');
const { ExecutionContext } = await load('execution') as typeof import('../execution');
const { bounds } = await load('differential-test-support') as typeof import('../differential-test-support');
const { integrateExponentialRational, verifyExponentialRationalDecision } = await load('exponential-rational-decision') as typeof import('../exponential-rational-decision');
const { encodeExponentialRationalDecision, decodeExponentialRationalDecision } = await load('exponential-rational-wire') as typeof import('../exponential-rational-wire');
const { nestedStress: stress } = await import('./nested-fixtures');
const output = option('--output'); if (!output) throw Error('--output required');
const artifacts = option('--artifacts'); if (artifacts) mkdirSync(artifacts, { recursive: true });
const savedArtifacts = option('--saved-artifacts');
const runs = Number(option('--runs', '5')), warmups = Number(option('--warmups', '2'));
if (!Number.isSafeInteger(runs) || runs < 1 || !Number.isSafeInteger(warmups) || warmups < 0) throw Error('run counts');
const limits = { work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256 };
const diagnostics = args.includes('--diagnostics');
if (diagnostics && option('--compare')) throw Error('diagnostics cannot supply acceptance timings');
class DiagnosticContext extends ExecutionContext {
  #bits = 0; #degree = -1;
  override integer(n: bigint): number { const bits = super.integer(n); this.#bits = Math.max(this.#bits, bits); return bits; }
  override degree(n: number): void { super.degree(n); this.#degree = Math.max(this.#degree, n); }
  get observations() { return { peakAcceptedIntegerBits: this.#bits, peakPolynomialDegree: this.#degree }; }
}
type C = InstanceType<typeof ExecutionContext>;
type S = ReturnType<typeof exponentialSetup>;
type E = S['t'];
type Sample = { ms: number; work: number; allocation: number; rss: number; heapUsed: number; maxRSSKiB: number; error?: string };
const results: Record<string, Record<string, Sample[]>> = {};
const artifactHashes: Record<string, string> = {};
const machine = { cpu: cpus()[0]?.model, host: hostname(), threads: cpus().length };
function save() { writeFileSync(output, JSON.stringify({ node: process.version, machine, limits, bounds, runs, warmups, diagnostics, artifactHashes, results }, null, 2)); }
function measure<T>(name: string, operation: string, i: number, fn: (c: C) => T): T | undefined {
  const c = diagnostics ? new DiagnosticContext(limits) : new ExecutionContext(limits), start = performance.now(); let value: T | undefined, error: string | undefined;
  try { value = fn(c); } catch (e) { if (!(e instanceof Error) || !e.message.startsWith('resource-limit:')) throw e; error = e.message; }
  const { rss, heapUsed } = process.memoryUsage(), sample = { ms: performance.now() - start, ...c.usage, rss, heapUsed, maxRSSKiB: process.resourceUsage().maxRSS,
    ...(c instanceof DiagnosticContext ? c.observations : {}), ...(error ? { error } : {}) };
  console.log(JSON.stringify({ name, operation, iteration: i, ...sample }));
  if (i >= 0) { results[name] ??= {}; results[name][operation] ??= []; results[name][operation].push(sample); save(); }
  return value;
}

function value(s: S, c: C, ns: number[], ds?: number[]) {
  return s.F.make(c, ns.map(n => s.f.fromInteger(c, BigInt(n))), ds?.map(n => s.f.fromInteger(c, BigInt(n))));
}
const selected = option('--cases').split(',').filter(Boolean);
const operations = option('--operations').split(',').filter(Boolean);
const cases: Record<string, { exponent?: number[]; denominator?: number[]; rp?: number[]; rpd?: number[]; fixture?: (s: S, c: C) => E }> = {
  'stress-shifted': { exponent: [1, 1], rp: [1] },
  'stress-quadratic': { exponent: [0, 0, 1], rp: [0, 2] },
  'stress-inverse': { exponent: [1], denominator: [0, 1], rp: [-1], rpd: [0, 0, 1] },
  affine: { fixture: (s, c) => value(s, c, [1], [1, 1]) }, repeated: { fixture: (s, c) => value(s, c, [1], [1, 2, 1]) },
  algebraicResidues: { fixture: (s, c) => value(s, c, [0, 1], [1, 0, 1]) },
  nonconstantResidue: { fixture: (s, c) => s.F.make(c, [s.f.fromInteger(c, 1n)], [s.x, s.f.fromInteger(c, 1n)]) },
  laurentObstruction: { fixture: (s, c) => s.F.add(c, value(s, c, [1], [1, 1]), s.F.multiply(c, s.F.embed(c, s.f.make(c, [s.f.parent!.fromInteger(c, 1n)], [s.f.parent!.fromInteger(c, 0n), s.f.parent!.fromInteger(c, 1n)])), s.t)) },
  rebasedLaurent: { fixture: (s, c) => value(s, c, [1, 0, 0, 0, 1], [0, 0, 1]) },
  rationalRootLogs: { fixture: (s, c) => s.F.embed(c, s.f.make(c, [s.f.parent!.fromInteger(c, 1n)], [1n, 0n, 1n].map(n => s.f.parent!.fromInteger(c, n)))) },
};
for (const name of selected) if (!cases[name]) throw Error(`unknown case ${name}`);
for (const [name, spec] of Object.entries(cases).filter(([n]) => !selected.length || selected.includes(n))) {
  // A single baseline artifact is used by BOTH versions' standalone verification timer.
  const savedPath = savedArtifacts && join(savedArtifacts, `${name}.json`);
  let saved: unknown = savedPath && existsSync(savedPath) ? JSON.parse(readFileSync(savedPath, 'utf8')) : undefined;
  const s = exponentialSetup(spec.exponent, spec.denominator), rp = spec.rp ? s.p(spec.rp, spec.rpd) : undefined;
  let replay: ReturnType<typeof decodeExponentialRationalDecision> | undefined;
  for (let i = -warmups; i < runs; i++) {
    const input = measure(name, 'input-direct', i, c => spec.fixture ? spec.fixture(s, c) : stress(c, s, rp!, false));
    const ordinary = rp ? measure(name, 'input-ordinary', i, c => stress(c, s, rp, true)) : undefined;
    if (input && ordinary && !s.F.equal(new ExecutionContext(limits), input, ordinary)) throw Error('input paths differ');
    if (!input) continue;
    if (operations.length && operations.every(o => o === 'input')) continue;
    const proof = measure(name, 'integration', i, c => integrateExponentialRational(c, s.F, input, bounds));
    if (!proof) continue;
    if (!saved) {
      saved = encodeExponentialRationalDecision(new ExecutionContext(limits), s.F, input, proof, bounds);
      if (artifacts) writeFileSync(join(artifacts, `${name}.json`), JSON.stringify(saved));
    }
    artifactHashes[name] ??= createHash('sha256').update(JSON.stringify(saved)).digest('hex');
    replay ??= decodeExponentialRationalDecision(new ExecutionContext(limits), s.F, input, saved, bounds);
    const bound = replay;
    measure(name, 'verification', i, c => { verifyExponentialRationalDecision(c, s.F, input, bound, bounds); return true; });
    if (operations.length && !operations.includes('encoding') && !operations.includes('decoding')) continue;
    const wire = measure(name, 'encoding', i, c => encodeExponentialRationalDecision(c, s.F, input, proof, bounds));
    if (wire) {
      const parsed = JSON.parse(JSON.stringify(wire));
      measure(name, 'decoding', i, c => decodeExponentialRationalDecision(c, s.F, input, parsed, bounds));
    }
  }
}
save();
if (option('--compare')) {
  const before = JSON.parse(readFileSync(option('--compare'), 'utf8'));
  if (!selected.length && JSON.stringify(Object.keys(before.results)) !== JSON.stringify(Object.keys(results))) throw Error('incomplete corpus');
  for (const key of ['node', 'machine', 'limits', 'bounds', 'runs', 'warmups']) {
    const current = { node: process.version, machine, limits, bounds, runs, warmups };
    if (JSON.stringify(before[key]) !== JSON.stringify(current[key as keyof typeof current])) throw Error(`incompatible ${key}`);
  }
  const median = (s: Sample[]) => s.map(v => v.ms).sort((a, b) => a - b)[Math.floor(s.length / 2)];
  for (const [name, operations] of Object.entries(results)) {
    if (before.artifactHashes[name] && before.artifactHashes[name] !== artifactHashes[name]) throw Error(`different verification artifact ${name}`);
    for (const [operation, samples] of Object.entries(operations)) {
      if (samples.length !== runs || samples.some(s => s.error)) throw Error(`candidate failure ${name}/${operation}`);
      const old: Sample[] | undefined = before.results[name]?.[operation];
      if (old && old.length !== runs) throw Error(`incomplete baseline ${name}/${operation}`);
      if (!old || old.some(s => s.error)) continue;
      const a = median(old), b = median(samples), target = name === 'stress-shifted' && ['integration', 'verification'].includes(operation);
      if (target ? a / b < 5 : b - a > Math.max(a * 0.2, 20)) throw Error(`regression ${name}/${operation}: ${a} -> ${b}`);
    }
    for (const op of ['input-direct', 'integration', 'verification', 'encoding', 'decoding']) if (!operations[op]) throw Error(`missing ${name}/${op}`);
    if (name.startsWith('stress-') && !operations['input-ordinary']) throw Error(`missing ordinary construction ${name}`);
  }
}
