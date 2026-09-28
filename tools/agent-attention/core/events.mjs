import fs from 'node:fs';
import path from 'node:path';

import { dispatch } from './dispatch.mjs';
import { appendLog, withState } from './state.mjs';

const MINUTE = 60_000;
const NOTIFYING = new Set(['critical', 'question', 'failure', 'complete']);

export function isDaemonAlive(state, now, timings) {
  if (!state.daemonBeatAt) return false;
  return now - state.daemonBeatAt < (timings.daemonTickSeconds * 3 + 60) * 1000;
}

function closePending(state, sessionId, status, now) {
  const pending = state.pending[sessionId];
  if (pending?.status === 'open') Object.assign(pending, { status, closedAt: now });
}

// Records one agent event in state and reports whether it should reach the user.
// Event types: launch, prompt, activity, critical, question, complete, failure, session-end.
export function applyEvent(state, event, now, timings) {
  const id = event.sessionId;
  const session = (state.sessions[id] ??= { agent: event.agent, firstSeenAt: now });
  if (event.agent) session.agent = event.agent;
  if (event.cwd) session.cwd = event.cwd;
  if (event.tmux) session.tmux = event.tmux;
  session.lastActivityAt = now;
  if (event.source !== 'pane') session.lastHookAt = now;

  switch (event.type) {
    case 'launch':
      // Launched Codex has no activity hook, so it starts as working and the pane
      // watcher keeps it alive; other agents report their own sessions.
      session.status = session.agent === 'codex' ? 'working' : 'launched';
      session.turnStartedAt = now;
      return { notify: false };
    case 'prompt':
    case 'activity':
      if (event.type === 'prompt' || session.status !== 'working') session.turnStartedAt = now;
      session.status = 'working';
      session.stallNotifiedAt = null;
      closePending(state, id, 'answered', now);
      return { notify: false };
    case 'critical':
    case 'question':
      session.status = 'waiting';
      state.pending[id] = {
        sessionId: id, agent: session.agent, level: event.type, text: event.text,
        cwd: session.cwd, tmux: session.tmux, askedAt: now, reAlertedAt: null, status: 'open',
      };
      return { notify: true };
    case 'complete': {
      const startedAt = session.turnStartedAt;
      session.status = 'idle';
      session.turnStartedAt = null;
      closePending(state, id, 'answered', now);
      // A quick turn means the user is probably watching; stay quiet.
      const minSeconds = timings.minTurnSecondsForCompletion ?? 0;
      const quick = !event.final && startedAt != null && now - startedAt < minSeconds * 1000;
      return { notify: !quick };
    }
    case 'failure':
      session.status = 'failed';
      closePending(state, id, 'closed', now);
      return { notify: true };
    case 'session-end':
      session.status = 'ended';
      closePending(state, id, 'closed', now);
      return { notify: false };
    default:
      return { notify: NOTIFYING.has(event.type) };
  }
}

// Advances timers: critical re-alerts, expiry, and stall detection.
export function applyTick(state, now, timings) {
  const out = [];
  for (const pending of Object.values(state.pending)) {
    if (pending.status !== 'open' || pending.level !== 'critical') continue;
    const age = now - pending.askedAt;
    const base = { agent: pending.agent, sessionId: pending.sessionId, cwd: pending.cwd, tmux: pending.tmux };
    if (age >= timings.expireMinutes * MINUTE) {
      Object.assign(pending, { status: 'expired', closedAt: now });
      const session = state.sessions[pending.sessionId];
      if (session) session.status = 'parked';
      out.push({ ...base, type: 'expired', text: `Unanswered for ${timings.expireMinutes} min. Nothing was approved; the agent stays stopped. Question: ${pending.text}`, pending });
    } else if (age >= timings.reAlertMinutes * MINUTE && !pending.reAlertedAt) {
      pending.reAlertedAt = now;
      out.push({ ...base, type: 'critical', reminder: true, text: pending.text });
    }
  }
  for (const [sessionId, session] of Object.entries(state.sessions)) {
    if (session.status !== 'working' || session.stallNotifiedAt) continue;
    if (now - session.lastActivityAt < timings.stallMinutes * MINUTE) continue;
    session.stallNotifiedAt = now;
    out.push({
      type: 'stalled', agent: session.agent, sessionId, cwd: session.cwd, tmux: session.tmux,
      text: `No activity for ${timings.stallMinutes} min while working. It may be stuck, waiting on an approval prompt, or running a long command.`,
    });
  }
  return out;
}

export function writeHandoff(pending, dir, now) {
  const name = `${new Date(now).toISOString().replace(/[:.]/g, '-')}-${String(pending.sessionId).replace(/[^\w-]/g, '_')}.md`;
  const body = [
    '# Agent Attention handoff',
    '',
    `- Agent: ${pending.agent}`,
    `- Session: ${pending.sessionId}`,
    `- Project: ${pending.cwd ?? 'unknown'}`,
    `- Asked: ${new Date(pending.askedAt).toISOString()}`,
    `- Expired: ${new Date(now).toISOString()}`,
    pending.tmux ? `- Attach: tmux attach -t ${pending.tmux}` : null,
    '',
    'The critical question below was not answered. Nothing was approved on your behalf;',
    'the agent was left stopped with its working tree untouched.',
    '',
    `> ${pending.text}`,
    '',
  ].filter((line) => line !== null).join('\n');
  const targets = [path.join(dir, 'handoffs')];
  if (pending.cwd && fs.existsSync(path.join(pending.cwd, '.task_tmp'))) targets.push(path.join(pending.cwd, '.task_tmp', 'agent-attention'));
  const written = [];
  for (const target of targets) {
    try {
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, name), body);
      written.push(path.join(target, name));
    } catch (error) {
      appendLog(dir, 'errors.log', `handoff: ${error.message}`);
    }
  }
  return written;
}

export async function handleEvent(event, ctx) {
  const now = ctx.now ?? Date.now();
  const { notify, daemonAlive } = withState(ctx.stateDir, (state) => ({
    ...applyEvent(state, event, now, ctx.config.timings),
    daemonAlive: isDaemonAlive(state, now, ctx.config.timings),
  }));
  if (!notify) return [];
  return dispatch(event, { ...ctx, daemonAlive });
}

export async function runTick(ctx) {
  const now = ctx.now ?? Date.now();
  const due = withState(ctx.stateDir, (state) => {
    state.daemonBeatAt = now;
    ctx.beforeTick?.(state, now);
    return applyTick(state, now, ctx.config.timings);
  });
  for (const event of due) {
    if (event.type === 'expired') {
      const files = writeHandoff(event.pending, ctx.stateDir, now);
      if (files.length) event.text += `\nHandoff: ${files.at(-1)}`;
    }
    delete event.pending;
    await dispatch(event, { ...ctx, daemonAlive: true });
  }
  return due;
}
