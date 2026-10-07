#!/usr/bin/env node
// Developer tool (NEW-EQUATION-RESPONSIVE1): the 60-second rule for testing New Equation cases.
// A case that runs longer than 60 s is abnormal: it is killed (SIGKILL, so a busy synchronous loop cannot ignore
// it) and the phase it was in is named, so the cause can be found. This is never a limit for users; the app has
// no time caps, only its typed work, memory and Stop limits.
//
//   node tools/equation-slow-case-probe.mjs                      the built-in cases
//   node tools/equation-slow-case-probe.mjs '{"rows":["x^2=2"],"domain":"complex"}' …
//
// Each case runs in its own process; assumption rows are read but not applied (the problem is probed as decided).
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const SLOW_CASE_LIMIT_MS = 60_000;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runner = resolve(root, 'tools/equation-slow-case-probe-runner.ts');
const viteNode = resolve(root, 'node_modules/vite-node/dist/cli.mjs');

export const DEFAULT_CASES = [
  { rows: ['x^3y^2+x=4y', 'x+y=7-x^2'], domain: 'real' },
  { rows: ['x^3y^2+x=4y', 'x+y=7-x^2'], domain: 'complex' },
  { rows: ['x^2+y^2=5', 'xy=2', 'x\\ne-1'], domain: 'real' },
  { rows: ['x^5-x-1=0'], domain: 'complex' },
  { rows: ['\\sin x=\\frac{1}{2}'], domain: 'real' },
  { rows: ['x^2=a', 'a>0'], domain: 'real' },
  // Certified numerics (EQUATION-CERTIFIED-NUMERICS1).
  { rows: ['\\cos x=x'], domain: 'real' },
  { rows: ['2^x+3^x=6'], domain: 'real' },
  { rows: ['e^x+x^3=5'], domain: 'real' },
  { rows: ['e^x+\\sin x=0', '-10\\le x\\le0'], domain: 'real' },
  { rows: ['e^x+\\sin x>0', 'x\\ge-10'], domain: 'real' },
  { rows: ['e^x+\\sin x=0'], domain: 'real' },
  // Systems eliminated to one certified root (PR B, B0: verification used to refine forever).
  { rows: ['y=\\sin x', 'x+e^y=2'], domain: 'real' },
  // Certified square systems (PR B): range rows, none needed, three unknowns, unbounded, a tangent solution.
  { rows: ['e^x+\\sin y=1', 'e^y-\\sin x=1', '-5\\le x\\le1', '-5\\le y\\le1'], domain: 'real' },
  { rows: ['\\sin(x+y)=x', '\\cos(x-y)=y'], domain: 'real' },
  { rows: ['x^2+y^2+z^2=3', 'e^x-yz=1', '\\sin y+xz=\\frac{1}{2}'], domain: 'real' },
  { rows: ['x^2+y^2+z^2=3', 'e^x-yz=1', '\\sin y+xz=0'], domain: 'real' },
  { rows: ['e^x+\\sin y=1', 'e^y+\\sin x=1'], domain: 'real' },
  { rows: ['e^x+\\sin y=1', 'e^y+\\sin x=1', '-1\\le x\\le1', '-1\\le y\\le1'], domain: 'real' },
  // EQUATION-SEMIALGEBRAIC1: ∨ ∧ ¬ rows and regions by cylindrical decomposition.
  { rows: ['x^2+y^2<1', 'y>x'], targets: ['x', 'y'], domain: 'real' },
  { rows: ['x^2+y^2<4', 'x^2+y^2>1'], targets: ['x', 'y'], domain: 'real' },
  { rows: ['x^2+y^2<1\\lor x>2'], targets: ['x', 'y'], domain: 'real' },
  { rows: ['x^2+y^2=5', 'xy=2', 'x>0', 'y>0'], targets: ['x', 'y'], domain: 'real' },
  { rows: ['x^2+y^2+z^2\\le1', 'z=x+y'], targets: ['x', 'y', 'z'], domain: 'real' },
  { rows: ['x^2+y^2+z^2<1'], targets: ['x', 'y', 'z'], domain: 'real' },
  { rows: ['y^3+xy+1<0'], targets: ['x', 'y'], domain: 'real' },
  { rows: ['x^2+y^2<1', 'x+y>2'], targets: ['x', 'y'], domain: 'real' },
  { rows: ['\\neg\\left(x^2\\le1\\right)'], domain: 'real' },
];

/** Run one case; resolves with its phases, and `killed` naming the phase that was running at 60 s. */
export function probeCase(input, limitMs = SLOW_CASE_LIMIT_MS) {
  return new Promise(done => {
    const started = Date.now(), phases = [];
    let current, outcome, buffer = '', stderr = '';
    const child = spawn(process.execPath, [viteNode, '--root', root, runner, JSON.stringify(input)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => child.kill('SIGKILL'), limitMs);
    child.stdout.on('data', chunk => {
      buffer += chunk;
      for (let i = buffer.indexOf('\n'); i >= 0; i = buffer.indexOf('\n')) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        if (event.event === 'start') current = event.phase;
        if (event.event === 'end' && event.phase !== 'done') { phases.push({ phase: event.phase, ms: event.ms }); current = undefined; }
        if (event.event === 'outcome') outcome = event.kind;
      }
    });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      done({ input, phases, outcome, ms: Date.now() - started, killed: signal === 'SIGKILL' ? current ?? 'startup' : undefined,
        error: code && signal !== 'SIGKILL' ? stderr.trim().split('\n').slice(-3).join(' ') : undefined });
    });
  });
}

const describe = r => {
  const name = `${r.input.rows.join(' ; ')} [${r.input.domain ?? 'real'}]`;
  const phases = r.phases.map(p => `${p.phase} ${p.ms} ms`).join(', ');
  if (r.killed) return `ABNORMAL (over ${SLOW_CASE_LIMIT_MS / 1000} s, killed in "${r.killed}"): ${name}\n    finished: ${phases || 'nothing'}`;
  if (r.error) return `FAILED: ${name}\n    ${r.error}`;
  return `${(r.ms / 1000).toFixed(1)} s  ${name}  → ${r.outcome}\n    ${phases}`;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cases = process.argv.length > 2 ? process.argv.slice(2).map(a => JSON.parse(a)) : DEFAULT_CASES;
  let abnormal = 0;
  for (const input of cases) {
    const r = await probeCase(input);
    if (r.killed || r.error) abnormal++;
    process.stdout.write(`${describe(r)}\n`);
  }
  process.exitCode = abnormal ? 1 : 0;
}
