import fs from 'node:fs';
import path from 'node:path';

const LOCK_STALE_MS = 10_000;
const LOCK_WAIT_MS = 3_000;

export function emptyState() {
  return { version: 1, sessions: {}, pending: {}, daemonBeatAt: null };
}

export function readState(dir) {
  try {
    return { ...emptyState(), ...JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8')) };
  } catch {
    return emptyState();
  }
}

function writeStateAtomic(dir, state) {
  const file = path.join(dir, 'state.json');
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function acquireLock(lockDir) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - fs.statSync(lockDir).mtimeMs > LOCK_STALE_MS) fs.rmSync(lockDir, { recursive: true, force: true });
      } catch {
        // The holder released the lock between our checks.
      }
      if (Date.now() > deadline) throw new Error(`State lock busy: ${lockDir}`);
      sleepSync(25);
    }
  }
}

// Hooks from several agents may fire at once, so every read-modify-write holds a
// directory lock and replaces state.json atomically.
export function withState(dir, mutate) {
  fs.mkdirSync(dir, { recursive: true });
  const lockDir = path.join(dir, 'state.lock');
  acquireLock(lockDir);
  try {
    const state = readState(dir);
    const result = mutate(state);
    writeStateAtomic(dir, state);
    return result;
  } finally {
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

export function appendLog(dir, name, line) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, name), `${new Date().toISOString()} ${line}\n`);
  } catch {
    // Logging must never break an agent hook.
  }
}
