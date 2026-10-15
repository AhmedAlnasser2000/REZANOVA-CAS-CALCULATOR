// One batch of corpus cases on New Equation's core (run by tools/equation-parity/run.mjs, which kills a case at 60 s).
// Every case prints a start line on stdout and appends its result to the output file, so a killed batch resumes
// at the next case. Values are recorded as decimals for inspection; nothing here reads display text.
import { appendFileSync, readFileSync } from 'node:fs';

type Case = { id: string; latex: string; targets?: string[]; domains?: Domain[] };
type Domain = 'real' | 'complex';
type Num = [number, number];
const [casesFile, fromArg, toArg, outFile, firstDomain] = process.argv.slice(2);
const all = (JSON.parse(readFileSync(casesFile, 'utf8')) as { cases: Case[] }).cases;
const from = Number(fromArg), to = Math.min(Number(toArg), all.length);
const domains: Domain[] = ['real', 'complex'];
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
    try { result = await runNew(all[i].latex, domain, all[i].targets); }
    catch (e) { result = { kind: 'crash', reason: String(e).slice(0, 200) }; }
    appendFileSync(outFile, `${JSON.stringify({ i, id: all[i].id, latex: all[i].latex, domain, forcedTargets: all[i].targets, ms: Math.round(performance.now() - started), ...result })}\n`);
  }
}
process.stdout.write(`${JSON.stringify({ event: 'done' })}\n`);
