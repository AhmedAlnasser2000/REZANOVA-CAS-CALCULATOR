#!/usr/bin/env node
// Developer tool (EQUATION-RECONSTRUCTION-CLOSEOUT1, PR A): compare the old engine with the new core on the corpus.
//   node tools/equation-parity/compare.mjs     summary on stdout; report.json and aligned.json in .task_tmp/equation-parity/
// Classes, best first: exact (3), certified numeric (2), approximate (1), refused (0: an error, a typed refusal,
// a kill: 10 s for the old engine, 60 s for the new core). A regression is a run where the new core's class is lower
// than the old engine's. Results are keyed by the problem's text, so reruns of a changed corpus reuse earlier runs.
// The same unknown on both sides: where the old answer names an unknown different from the new core's automatic
// choice (the old engine often solved for a parameter), the new core's run with that unknown ("aligned") is used.
// Where both give finitely many values they are compared numerically; a mismatch is listed for review.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = join(root, '.task_tmp/equation-parity');
const read = f => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const corpus = read('corpus.json').cases;
const v1 = existsSync(join(dir, 'corpus-v1.json')) ? read('corpus-v1.json').cases : corpus;
const key = (latex, domain) => `${domain}\u0000${latex}`;
function load(prefix) {
  const map = new Map();
  for (const f of readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.jsonl'))) {
    const legacy = /^(old|new)-\d+\.jsonl$/u.test(f);
    for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
      if (!line) continue;
      const r = JSON.parse(line), latex = r.latex ?? (legacy ? v1[r.i]?.latex : undefined);
      if (latex !== undefined) map.set(key(latex, r.domain), r);
    }
  }
  return map;
}
const olds = load('old-'), news = new Map([...load('new-')].filter(([, r]) => !r.forcedTargets)), aligned = load('new-aligned-');

const OLD_LIMIT_MS = 10_000; // results recorded before the 10-second old-engine limit count as killed above it
const RANK = { exact: 3, certified: 2, approximate: 1, refused: 0, unreadable: 0, missing: -1 };
function oldClass(r) {
  if (!r) return 'missing';
  if (r.ms > OLD_LIMIT_MS || r.kind !== 'success') return 'refused';
  return r.solutionKind === 'approximate-numeric' || r.origin === 'numeric-fallback' ? 'approximate' : 'exact';
}
function newClass(r) {
  if (!r) return 'missing';
  if (r.kind === 'row-error') return 'unreadable';
  if ((r.kind !== 'solved' && r.kind !== 'empty') || r.verified === false) return 'refused';
  return r.certified ? 'certified' : 'exact';
}
function oldTarget(r) {
  try { const m = JSON.parse(r?.math ?? 'null'); return Array.isArray(m) && ['Equal', 'Element'].includes(m[0]) && typeof m[1] === 'string' ? m[1] : undefined; }
  catch { return undefined; }
}
const close = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= 2e-6 * Math.max(1, Math.hypot(...a));
function sameValues(a, b) {
  if (a.length !== b.length) return false;
  const used = new Set();
  return a.every(x => { const j = b.findIndex((y, k) => !used.has(k) && close(x, y)); if (j < 0) return false; used.add(j); return true; });
}

const counts = { old: {}, new: {} }, regressions = [], mismatches = [], killed = [], unreadable = [], toAlign = new Map();
let runs = 0, bothUnreadable = 0, wins = 0, alignedUsed = 0;
for (const c of corpus) {
  for (const domain of ['real', 'complex']) {
    const o = olds.get(key(c.latex, domain));
    let n = news.get(key(c.latex, domain));
    const t = oldClass(o) !== 'refused' ? oldTarget(o) : undefined;
    if (t && n?.targets && (n.targets.length !== 1 || n.targets[0] !== t)) {
      const a = aligned.get(key(c.latex, domain));
      if (a) { n = a; alignedUsed++; } else {
        const entry = toAlign.get(c.latex) ?? { id: c.id, latex: c.latex, targets: [t], domains: [] };
        entry.domains.push(domain); toAlign.set(c.latex, entry);
      }
    }
    const oc = oldClass(o), nc = newClass(n);
    if (oc === 'refused' && nc === 'unreadable') { bothUnreadable++; continue; }
    runs++;
    counts.old[oc] = (counts.old[oc] ?? 0) + 1; counts.new[nc] = (counts.new[nc] ?? 0) + 1;
    const row = { id: c.id, latex: c.latex, domain, targets: n?.targets, oldTarget: t, old: oc, new: nc, oldMs: o?.ms, newMs: n?.ms, oldInfo: o?.error ?? o?.math, newInfo: n?.reason ?? n?.verifyError, source: c.sources[0] };
    if (n?.kind === 'killed') killed.push(row);
    if (nc === 'unreadable') unreadable.push(row);
    if (RANK[nc] < RANK[oc]) regressions.push(row); else if (RANK[nc] > RANK[oc]) wins++;
    const ov = o?.empty ? [] : o?.values, nv = n?.kind === 'empty' ? [] : n?.values;
    if (ov && nv && oc !== 'refused' && nc !== 'refused' && !sameValues(ov, nv)) mismatches.push({ ...row, oldValues: ov, newValues: nv });
  }
}
writeFileSync(join(dir, 'aligned.json'), `${JSON.stringify({ cases: [...toAlign.values()] }, null, 1)}\n`);
writeFileSync(join(dir, 'report.json'), `${JSON.stringify({ runs, bothUnreadable, counts, regressions, mismatches, wins, killed, unreadable }, null, 1)}\n`);
console.log(JSON.stringify({ problems: corpus.length, runs, bothUnreadable, counts, regressions: regressions.length, mismatches: mismatches.length, wins, newKilled: killed.length, newUnreadable: unreadable.length, alignedUsed, stillToAlign: toAlign.size }, null, 1));
