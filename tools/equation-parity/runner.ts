// One batch of parity cases on one engine (run by tools/equation-parity/run.mjs, which kills a case at 60 s).
// Every case prints a start line on stdout and appends its result to the output file, so a killed batch resumes
// at the next case. Values are compared numerically by the report; nothing here reads display text.
import { appendFileSync, readFileSync } from 'node:fs';
import { ComputeEngine } from '@cortex-js/compute-engine';

type Case = { id: string; latex: string; targets?: string[]; domains?: Domain[] };
type Domain = 'real' | 'complex';
type Num = [number, number];
const [engine, casesFile, fromArg, toArg, outFile, firstDomain] = process.argv.slice(2);
const all = (JSON.parse(readFileSync(casesFile, 'utf8')) as { cases: Case[] }).cases;
const from = Number(fromArg), to = Math.min(Number(toArg), all.length);
const domains: Domain[] = ['real', 'complex'];
const ce = new ComputeEngine();

function numeric(expr: unknown): Num | undefined {
  try {
    const v = ce.box(expr as never).N() as unknown as { re: number; im: number };
    return Number.isFinite(v.re) && Number.isFinite(v.im) ? [v.re, v.im] : undefined;
  } catch { return undefined; }
}
const symbolsOf = (expr: unknown, out = new Set<string>()): Set<string> => {
  if (typeof expr === 'string' && /^[A-Za-z]\w*$/u.test(expr) && !['Pi', 'ExponentialE', 'ImaginaryUnit', 'EmptySet'].includes(expr)) out.add(expr);
  if (Array.isArray(expr)) expr.slice(1).forEach(e => symbolsOf(e, out));
  return out;
};

async function runOld(latex: string, domain: Domain) {
  const { runEquationMode } = await import('../../src/lib/modes/equation');
  const { makeRequest } = await import('../../src/lib/modes/equation/test-support');
  const r = runEquationMode({ ...makeRequest(), equationScreen: 'symbolic', equationLatex: latex, equationAnswerMode: 'exact', equationDomainIntent: domain, angleUnit: 'rad' } as never) as unknown as Record<string, unknown>;
  const math = (r.primaryMath as { mathJson?: unknown } | undefined)?.mathJson;
  let values: Num[] | undefined, family = false, empty = false;
  if (Array.isArray(math) && math[0] === 'Element') {
    const target = math[1], set = math[2];
    if (set === 'EmptySet') empty = true;
    else if (Array.isArray(set) && set[0] === 'Set') {
      const free = new Set([...symbolsOf(set)].filter(s => s !== target));
      family = free.size > 0;
      if (!family) { const v = set.slice(1).map(numeric); if (v.every(Boolean)) values = v as Num[]; }
    }
  }
  if (!values && Array.isArray(r.candidateValues)) values = (r.candidateValues as number[]).map(v => [v, 0] as Num);
  // Many old complex answers carry no MathJSON, only LaTeX branches: for this measurement only, evaluate them with
  // Compute Engine (the old engine has no other machine-readable form). Families (a free integer) are not evaluated.
  const branches = r.branchReadback as { branchesLatex?: string[]; relationLatex?: string } | undefined;
  if (!values && !family && branches?.branchesLatex?.length && ['\\in', '\\approx', '='].includes(branches.relationLatex ?? '')) {
    const parsed = branches.branchesLatex.map(l => ce.parse(l));
    if (parsed.some(p => [...symbolsOf(p.json)].some(s => s !== 'i'))) family = true;
    else { const v = parsed.map(p => numeric(p.json)); if (v.every(Boolean)) values = v as Num[]; }
  }
  return {
    kind: r.kind, origin: r.resultOrigin, solutionKind: r.solutionKind, answerDomain: r.answerDomain,
    empty, family, values, error: typeof r.error === 'string' ? r.error.slice(0, 160) : undefined,
    math: math === undefined ? undefined : JSON.stringify(math).slice(0, 400),
  };
}

async function runNew(latex: string, domain: Domain, forced?: string[]) {
  const { parseRow, autoTargets } = await import('../../src/lib/new-equation/parse');
  const { DEFAULT_EQUATION_LIMITS } = await import('../../src/lib/new-equation/types');
  const { decideEquation, verifyEquationOutcome } = await import('../../src/lib/symbolic-engine/equation/core/decide');
  const { ExecutionContext } = await import('../../src/lib/symbolic-engine/equation/core/execution');
  const { ExpressionStore } = await import('../../src/lib/symbolic-engine/equation/core/representation/expression');
  const { projectEquationOutcome } = await import('../../src/lib/symbolic-engine/equation/result');
  const { lowerEquation } = await import('../../src/lib/symbolic-engine/equation/service/input');
  const { decimalOf } = await import('../../src/lib/symbolic-engine/equation/presentation/values');
  const row = parseRow(latex);
  if (row.kind === 'error') return { kind: 'row-error', reason: row.message.slice(0, 160) };
  const targets = forced ?? autoTargets([row]);
  const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS });
  const store = new ExpressionStore(ctx);
  const { problem } = lowerEquation(store, { rows: [latex], targets, domain, limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
  const outcome = decideEquation(problem);
  const result: Record<string, unknown> = { kind: outcome.kind, targets };
  if (outcome.kind !== 'solved' && outcome.kind !== 'empty') { result.reason = ('reason' in outcome ? String(outcome.reason) : JSON.stringify((outcome as { stop?: unknown }).stop)).slice(0, 160); return result; }
  try { verifyEquationOutcome(problem, outcome); result.verified = true; } catch (e) { result.verified = false; result.verifyError = String(e).slice(0, 160); }
  if (outcome.kind === 'solved') {
    const set = outcome.set;
    result.setKind = set.kind;
    if (set.kind === 'finite' && set.variables.length === 1) {
      const vs: Num[] = [];
      for (const p of set.points) {
        const d = decimalOf(store, p[0], 12, domain);
        if (!d) { result.values = undefined; break; }
        const im = d.im ? (d.im.negative ? -1 : 1) * Number(d.im.magnitude) : 0;
        vs.push([Number(d.re), im]);
      }
      if (vs.length === set.points.length) result.values = vs;
    }
    try {
      const doc = projectEquationOutcome(problem, outcome).canonicalResult as { primary?: { roots?: { kind: string }[] } };
      result.certified = (doc.primary?.roots ?? []).some(b => b.kind === 'isolated-real-root' || b.kind === 'isolated-real-point');
    } catch (e) { result.projectError = String(e).slice(0, 160); }
  }
  return result;
}

for (let i = from; i < to; i++) {
  for (const domain of domains) {
    if (i === from && firstDomain === 'complex' && domain === 'real') continue;
    if (all[i].domains && !all[i].domains.includes(domain)) continue;
    process.stdout.write(`${JSON.stringify({ i, domain, event: 'start' })}\n`);
    const started = performance.now();
    let result: Record<string, unknown>;
    try { result = engine === 'old' ? await runOld(all[i].latex, domain) : await runNew(all[i].latex, domain, all[i].targets); }
    catch (e) { result = { kind: 'crash', reason: String(e).slice(0, 200) }; }
    appendFileSync(outFile, `${JSON.stringify({ i, id: all[i].id, latex: all[i].latex, domain, forcedTargets: all[i].targets, ms: Math.round(performance.now() - started), ...result })}\n`);
  }
}
process.stdout.write(`${JSON.stringify({ event: 'done' })}\n`);
