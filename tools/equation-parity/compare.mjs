#!/usr/bin/env node
// Developer tool (EQUATION-RECONSTRUCTION-CLOSEOUT1, PR A): compare the old engine with the new core on the corpus.
//   node tools/equation-parity/compare.mjs            summary on stdout, details in .task_tmp/equation-parity/
// Classes, best first: exact (3), certified numeric (2), approximate (1), refused (0: an error, a typed refusal,
// a kill: 10 s for the old engine, 60 s for the new core). A regression is a run where the new core's class is lower than the old engine's. Where both
// give finitely many values they are compared numerically; a mismatch is listed for review, not judged here.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = join(root, '.task_tmp/equation-parity');
const corpus = JSON.parse(readFileSync(join(dir, 'corpus.json'), 'utf8')).cases;
const load = engine => {
  const map = new Map();
  for (const f of readdirSync(dir).filter(f => f.startsWith(`${engine}-`) && f.endsWith('.jsonl') && !f.includes('pilot'))) {
    for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) if (line) { const r = JSON.parse(line); map.set(`${r.i}:${r.domain}`, r); }
  }
  return map;
};
const olds = load('old'), news = load('new');

const RANK = { exact: 3, certified: 2, approximate: 1, refused: 0, unreadable: 0, missing: -1 };
const OLD_LIMIT_MS = 10_000; // results recorded before the 10-second old-engine limit count as killed above it
function oldClass(r) {
  if (!r) return 'missing';
  if (r.ms > OLD_LIMIT_MS) return 'refused';
  if (r.kind !== 'success') return 'refused';
  return r.solutionKind === 'approximate-numeric' || r.origin === 'numeric-fallback' ? 'approximate' : 'exact';
}
function newClass(r) {
  if (!r) return 'missing';
  if (r.kind === 'row-error') return 'unreadable';
  if (r.kind !== 'solved' && r.kind !== 'empty') return 'refused';
  if (r.verified === false) return 'refused';
  return r.certified ? 'certified' : 'exact';
}
const close = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= 2e-6 * Math.max(1, Math.hypot(...a));
function sameValues(a, b) {
  if (a.length !== b.length) return false;
  const used = new Set();
  return a.every(x => { const j = b.findIndex((y, k) => !used.has(k) && close(x, y)); if (j < 0) return false; used.add(j); return true; });
}

const counts = { old: {}, new: {} }, regressions = [], mismatches = [], wins = [], unreadable = [], killed = [];
let runs = 0, bothUnreadable = 0;
for (const [i, c] of corpus.entries()) {
  for (const domain of ['real', 'complex']) {
    const o = olds.get(`${i}:${domain}`), n = news.get(`${i}:${domain}`);
    const oc = oldClass(o), nc = newClass(n);
    if (oc === 'refused' && nc === 'unreadable') { bothUnreadable++; continue; }
    runs++;
    counts.old[oc] = (counts.old[oc] ?? 0) + 1; counts.new[nc] = (counts.new[nc] ?? 0) + 1;
    const row = { id: c.id, latex: c.latex, domain, old: oc, new: nc, oldMs: o?.ms, newMs: n?.ms, oldInfo: o?.error ?? o?.math, newInfo: n?.reason ?? n?.verifyError, source: c.sources[0] };
    if (n?.kind === 'killed' || o?.kind === 'killed') killed.push(row);
    if (nc === 'unreadable') unreadable.push(row);
    if (RANK[nc] < RANK[oc]) regressions.push(row);
    else if (RANK[nc] > RANK[oc]) wins.push(row);
    const ov = o?.empty ? [] : o?.values, nv = n?.kind === 'empty' ? [] : n?.values;
    if (ov && nv && oc !== 'refused' && nc !== 'refused' && !sameValues(ov, nv)) mismatches.push({ ...row, oldValues: ov, newValues: nv });
  }
}
const details = { runs, bothUnreadable, counts, regressions, mismatches, wins: wins.length, killed, unreadable };
writeFileSync(join(dir, 'report.json'), `${JSON.stringify(details, null, 1)}\n`);
console.log(JSON.stringify({ problems: corpus.length, runs, bothUnreadable, counts, regressions: regressions.length, mismatches: mismatches.length, wins: wins.length, killed: killed.length, newUnreadable: unreadable.length }, null, 1));
