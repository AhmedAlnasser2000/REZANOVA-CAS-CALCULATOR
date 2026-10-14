#!/usr/bin/env node
// Developer tool (EQUATION-RECONSTRUCTION-CLOSEOUT1, PR A): run the parity corpus on one engine.
//   node tools/equation-parity/run.mjs old|new [shards=4]
// Each shard is a process that runs its cases in turn (real, then complex). The 60-second rule: a case still running
// after 60 s is abnormal, so the shard is killed (SIGKILL), the case is recorded as "killed", and the shard restarts
// at the next case. Results: .task_tmp/equation-parity/<engine>-<shard>.jsonl.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = join(root, '.task_tmp/equation-parity');
const engine = process.argv[2], shards = Number(process.argv[3] ?? 4);
if (engine !== 'old' && engine !== 'new') throw new Error('usage: run.mjs old|new [shards]');
const corpus = join(dir, 'corpus.json');
const total = JSON.parse(readFileSync(corpus, 'utf8')).cases.length;
const LIMIT = 60_000;
const viteNode = join(root, 'node_modules/vite-node/dist/cli.mjs');

function runShard(shard, from, to) {
  const out = join(dir, `${engine}-${shard}.jsonl`);
  if (existsSync(out)) rmSync(out);
  return new Promise(done => {
    const start = (at, firstDomain = 'real') => {
      if (at >= to) return done();
      const child = spawn(process.execPath, [viteNode, '--root', root, join(root, 'tools/equation-parity/runner.ts'), engine, corpus, String(at), String(to), out, firstDomain], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });
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
          console.log(`${engine} shard ${shard}: case ${current.i} (${current.domain}) killed at 60 s`);
          // Resume with the next run: the same case over ℂ after a killed real run, else the next case.
          return current.domain === 'real' ? start(current.i, 'complex') : start(current.i + 1);
        }
        done();
      });
    };
    start(from);
  });
}

const size = Math.ceil(total / shards), started = Date.now();
await Promise.all(Array.from({ length: shards }, (_, s) => runShard(s, s * size, Math.min(total, (s + 1) * size))));
console.log(`${engine}: ${total} cases in ${Math.round((Date.now() - started) / 1000)} s`);
