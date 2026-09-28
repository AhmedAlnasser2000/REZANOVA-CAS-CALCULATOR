import { execFileSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';

import { applyEvent } from './events.mjs';

const PANE_GRACE_MS = 10_000;

export function shellQuote(value) {
  return /^[\w@%+=:,./-]+$/.test(value) ? value : `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function tmuxSessionName(name) {
  return `attn-${String(name).replace(/[^\w-]/g, '-')}`;
}

export function guessAgent(command) {
  const program = String(command[0] ?? '').split('/').at(-1);
  if (program === 'codex') return 'codex';
  if (program === 'claude') return 'claude';
  return program || 'agent';
}

export function buildLaunchArgs({ name, command, cwd, nodePath, attnPath }) {
  const session = tmuxSessionName(name);
  const inner = [nodePath, attnPath, 'run-wrapped', session, '--', ...command].map(shellQuote).join(' ');
  return { session, args: ['new-session', '-d', '-s', session, '-c', cwd, `ATTN_TMUX=${session} ${inner}`] };
}

// Runs the agent in the foreground of its tmux pane and reports how it exited.
export function runWrapped(command, { onExit }) {
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), { stdio: 'inherit' });
    child.on('error', (error) => resolve(onExit({ code: 127, signal: null, error })));
    child.on('exit', (code, signal) => resolve(onExit({ code, signal })));
  });
}

export function exitEvent({ session, agent, cwd, code, signal, error }) {
  const base = { agent, sessionId: session, cwd, tmux: session, final: true };
  if (code === 0) return { ...base, type: 'complete', text: 'Agent process exited normally (code 0).' };
  const why = error ? `could not start: ${error.message}` : signal ? `killed by ${signal}` : `exit code ${code}`;
  return { ...base, type: 'failure', text: `Agent process ended unexpectedly (${why}).` };
}

function capturePane(session) {
  try {
    const text = execFileSync('tmux', ['capture-pane', '-p', '-t', session], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return crypto.createHash('sha1').update(text).digest('hex');
  } catch {
    return null;
  }
}

// Codex has no per-tool hook, so for launched Codex sessions the daemon treats a
// changing pane as activity. A baseline is re-taken shortly after every recorded
// event so that final rendering of a question is not mistaken for an answer.
export function watchPanes(state, now, timings, capture = capturePane) {
  for (const [sessionId, session] of Object.entries(state.sessions)) {
    if (session.agent !== 'codex' || !session.tmux) continue;
    if (!['working', 'idle', 'waiting'].includes(session.status)) continue;
    const hash = capture(session.tmux);
    if (!hash) continue;
    const baselineFresh = session.paneHashAt && session.paneHashAt - (session.lastHookAt ?? 0) >= PANE_GRACE_MS;
    if (baselineFresh && hash !== session.paneHash) applyEvent(state, { type: 'activity', sessionId, source: 'pane' }, now, timings);
    session.paneHash = hash;
    session.paneHashAt = now;
  }
}
