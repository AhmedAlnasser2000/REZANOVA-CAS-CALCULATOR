#!/usr/bin/env node
// Developer tool (EQUATION-RECONSTRUCTION-CLOSEOUT1, PR A): run the corpus on New Equation's core.
//   node tools/equation-parity/run.mjs [shards=4] [--fresh] [--corpus=<path, default tools/equation-parity/corpus.json>] [--tag=<name>]
// Each shard is a process that runs its cases in turn (real, then complex). A case still running at 60 s (the
// 60-second rule) is killed (SIGKILL), recorded as "killed", and the shard restarts at the next run. An interrupted
// run resumes after the last recorded result. Results: .task_tmp/equation-parity/new[-<tag>]-<shard>.jsonl; the
// summary comes from report.mjs.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = join(root, '.task_tmp/equation-parity');
const engine = 'new', shards = Number(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 4);
const option = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const corpus = resolve(root, option('corpus') ?? 'tools/equation-parity/corpus.json'), tag = option('tag');
const total = JSON.parse(readFileSync(corpus, 'utf8')).cases.length;
const LIMIT = 60_000;
mkdirSync(dir, { recursive: true });
const viteNode = join(root, 'node_modules/vite-node/dist/cli.mjs');

function runShard(shard, from, to) {
  const out = join(dir, `${engine}-${tag ? `${tag}-` : ''}${shard}.jsonl`);
  let resumeAt = from, resumeDomain = 'real';
  if (process.argv.includes('--fresh') && existsSync(out)) rmSync(out);
  if (existsSync(out)) {
    const done = readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    const last = done.at(-1);
    if (last) [resumeAt, resumeDomain] = last.domain === 'real' ? [last.i, 'complex'] : [last.i + 1, 'real'];
  }
  return new Promise(done => {
    const start = (at, firstDomain = 'real') => {
      if (at >= to) return done();
      const child = spawn(process.execPath, [viteNode, '--root', root, join(root, 'tools/equation-parity/runner.ts'), corpus, String(at), String(to), out, firstDomain], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });
      let current, timer, buffer = '', finished = false;
      const arm = () => { clearTimeout(timer); timer = setTimeout(() => { finished = true; child.kill('SIGKILL'); }, LIMIT); };
      child.stdout.on('data', chunk => {
        buffer += chunk;
        let nl;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1);
          try { const m = JSON.parse(line); if (m.event === 'start') { current = m; arm(); } } catch { /* other output */ }
        }
      });
      child.on('exit', () => {
        clearTimeout(timer);
        if (finished && current) {
          appendFileSync(out, `${JSON.stringify({ i: current.i, domain: current.domain, kind: 'killed', ms: LIMIT })}\n`);
          console.log(`${engine} shard ${shard}: case ${current.i} (${current.domain}) killed at ${LIMIT / 1000} s`);
          // Resume with the next run: the same case over ℂ after a killed real run, else the next case.
          return current.domain === 'real' ? start(current.i, 'complex') : start(current.i + 1);
        }
        done();
      });
    };
    start(resumeAt, resumeDomain);
  });
}

const size = Math.ceil(total / shards), started = Date.now();
await Promise.all(Array.from({ length: shards }, (_, s) => runShard(s, s * size, Math.min(total, (s + 1) * size))));
console.log(`${engine}: ${total} cases in ${Math.round((Date.now() - started) / 1000)} s`);
