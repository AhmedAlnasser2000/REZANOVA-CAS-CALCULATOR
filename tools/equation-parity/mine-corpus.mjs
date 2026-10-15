#!/usr/bin/env node
// Developer tool (EQUATION-RECONSTRUCTION-CLOSEOUT1, PR A): the parity corpus.
// Problems come from two places: the 50-case baseline table of the reconstruction inventory, and every equation-like
// string literal in the old engine's tests (its tests are a problem corpus only; their expectations are not used).
// Strings that are not equations (answers, prose) are kept: both engines see them, and those neither engine can read
// are counted and set aside by the report. Output: .task_tmp/equation-parity/corpus.json.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, '.task_tmp/equation-parity');

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (p.endsWith('.test.ts')) files.push(p);
  }
  return files;
}

/** Undo TypeScript string escapes: '\\frac' in source is \frac in the value. */
function unescape(raw) {
  return raw.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|.)/gu, (_, e) => {
    if (e.startsWith('u{')) return String.fromCodePoint(parseInt(e.slice(2, -1), 16));
    if (e.startsWith('u') && e.length === 5) return String.fromCharCode(parseInt(e.slice(1), 16));
    return { n: '\n', t: '\t', r: '\r' }[e] ?? e;
  });
}

const relation = /=|<|>|\\(?:le|ge|ne|lt|gt|leq|geq|neq)(?![a-zA-Z])/u;
const answerLike = /^[a-zA-Z]\s*(?:\\in|\\approx|~=)|\\varnothing|\\mathbb\{Z\}/u;
const prose = /[A-Za-z]{4,} [A-Za-z]{3,}/u;

const cases = new Map();
function add(latex, source, extra = {}) {
  const key = `${latex}`;
  const entry = cases.get(key) ?? { latex, sources: [], ...extra };
  if (!entry.sources.includes(source)) entry.sources.push(source);
  cases.set(key, entry);
}

// 1. The baseline table.
const inventory = readFileSync(join(root, 'docs/architecture/equation/equation-reconstruction-inventory.md'), 'utf8');
for (const line of inventory.split('\n')) {
  const m = /^\| ([A-Z]\d+) \| `(.+?)` \|/u.exec(line);
  if (m) add(m[2].replace(/\\\|/gu, '|'), `baseline ${m[1]}`, { baseline: m[1] });
}

// 2. Legacy test literals.
const legacyFiles = [
  ...walk(join(root, 'src/lib/equation')),
  ...walk(join(root, 'src/lib/modes/equation')),
  join(root, 'src/lib/modes/equation-complex-stability.test.ts'),
];
let literals = 0;
for (const file of legacyFiles) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  const source = relative(root, file);
  for (const m of text.matchAll(/(String\.raw)?(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`([^`$\n]*)`)/gu)) {
    // String.raw`…` keeps its backslashes as written; ordinary literals are unescaped.
    const raw = m[4] ?? '';
    const value = m[1] && m[4] !== undefined ? raw : unescape(m[2] ?? m[3] ?? raw);
    if (!relation.test(value) || prose.test(value) || answerLike.test(value)) continue;
    if (value.includes('=>') || /^(https?:|\.{1,2}\/|<)/u.test(value) || value.length > 400) continue;
    literals++;
    add(value.trim(), source);
  }
}

mkdirSync(out, { recursive: true });
const list = [...cases.values()].map((c, i) => ({ id: c.baseline ?? `L${i + 1}`, ...c }));
writeFileSync(join(out, 'corpus.json'), `${JSON.stringify({ files: legacyFiles.length, literals, cases: list }, null, 1)}\n`);
console.log(`${list.length} distinct problems (${list.filter(c => c.baseline).length} baseline) from ${legacyFiles.length} test files and ${literals} literals`);
