#!/usr/bin/env node
// Developer tool (EQUATION-RECONSTRUCTION-CLOSEOUT1, PR A): the new core's results on the corpus, for the capability
// ledger. Nothing here compares with the old engine (user decision, 2026-10-14: its baseline is not a target).
//   node tools/equation-parity/report.mjs [--tag=<name>]   summary on stdout; report-<tag>.json in .task_tmp/equation-parity/
// Classes: exact, certified (an isolated real root or point), refused (a typed outcome: unsupported, incomplete
// implementation, resource, or input the lowering rejects with a typed message), failed (verification failed, crash, an internal error), killed (60 s), unreadable (the
// row does not parse: a corpus string that is not an equation). Refusals are grouped by their typed owner and detail.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = join(root, '.task_tmp/equation-parity');
const tag = process.argv.find(a => a.startsWith('--tag='))?.slice(6);
const prefix = `new-${tag ? `${tag}-` : ''}`;
const runs = [];
for (const f of readdirSync(dir).filter(f => f.startsWith(prefix) && /^\d+\.jsonl$/u.test(f.slice(prefix.length)))) {
  for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) if (line) runs.push(JSON.parse(line));
}
const corpus = JSON.parse(readFileSync(join(root, 'tools/equation-parity/corpus.json'), 'utf8')).cases;
const latexOf = r => r.latex ?? corpus[r.i]?.latex;

function classOf(r) {
  if (r.kind === 'killed') return 'killed';
  if (r.kind === 'row-error') return 'unreadable';
  // Input the lowering rejects with a typed message (an inequality over ℂ, an unsupported symbol) is a typed refusal.
  if (r.kind === 'crash' && /^EquationInputError/u.test(r.reason ?? '')) return 'refused';
  if (r.kind === 'crash' || r.verified === false) return 'failed';
  if (r.kind === 'solved' || r.kind === 'empty') return r.certified ? 'certified' : 'exact';
  return /internal|invalid-input|division-by-zero|verification-failed|is not real|power of zero/u.test(r.reason ?? '') ? 'failed' : 'refused';
}
// A refusal's group: its typed owner and the detail up to the first parenthesis or colon after it.
const groupOf = r => (r.reason ?? r.kind).replace(/\s*\(.*$/u, '').replace(/^(.{0,110}).*$/u, '$1');

const counts = { real: {}, complex: {} }, refusals = {}, failures = [], killed = [], slow = [];
for (const r of runs) {
  const c = classOf(r);
  counts[r.domain][c] = (counts[r.domain][c] ?? 0) + 1;
  const row = { latex: latexOf(r), domain: r.domain, kind: r.kind, ms: r.ms, reason: r.reason ?? r.verifyError };
  if (c === 'refused') (refusals[groupOf(r)] ??= []).push(row);
  if (c === 'failed') failures.push(row);
  if (c === 'killed') killed.push(row);
  if (c !== 'killed' && r.ms > 10_000) slow.push(row);
}
const sortedRefusals = Object.entries(refusals).sort((a, b) => b[1].length - a[1].length).map(([group, rows]) => ({ group, count: rows.length, examples: rows.slice(0, 4) }));
const report = { tag: tag ?? null, runs: runs.length, counts, refusals: sortedRefusals, failures, killed, slow: slow.sort((a, b) => b.ms - a.ms) };
writeFileSync(join(dir, `report-${tag ?? 'new'}.json`), `${JSON.stringify(report, null, 1)}\n`);
console.log(JSON.stringify({ runs: runs.length, counts, refusalGroups: sortedRefusals.length, failures: failures.length, killed: killed.length, slow10to60: slow.length }, null, 1));
