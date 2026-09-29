import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { fromClaudeHook, fromCodexNotify, lastAssistantText } from './core/adapters.mjs';
import { classifyClaudeNotification, classifyTurnEnd, formatAlert, parseMarker } from './core/classify.mjs';
import { DEFAULT_CONFIG, resolveConfig } from './core/config.mjs';
import { dispatch, reserveAlertSlot } from './core/dispatch.mjs';
import { applyEvent, applyTick, handleEvent, runTick } from './core/events.mjs';
import { addClaudeHooks, addCodexNotify, removeClaudeHooks, removeCodexNotify, systemdUnit } from './core/install.mjs';
import { buildLaunchArgs, exitEvent, guessAgent, shellQuote, watchPanes } from './core/launch.mjs';
import { emptyState, readState } from './core/state.mjs';

const MIN = 60_000;
const timings = DEFAULT_CONFIG.timings;
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'attn-'));

test('parseMarker finds critical and question markers near the end of a message', () => {
  assert.deepEqual(parseMarker('Work done.\n\nATTENTION: critical — Drop the table?'), { level: 'critical', text: 'Drop the table?' });
  assert.deepEqual(parseMarker('**ATTENTION: question** - Commit now?'), { level: 'question', text: 'Commit now?' });
  assert.deepEqual(parseMarker('attention: Question: push?'), { level: 'question', text: 'push?' });
  assert.equal(parseMarker('I paid attention: critical path is fine.'), null);
  assert.equal(parseMarker(`ATTENTION: critical — old\n${'line\n'.repeat(20)}done`), null);
});

test('classifyTurnEnd maps unmarked turns to completion', () => {
  assert.equal(classifyTurnEnd('All tests pass.').type, 'complete');
  assert.equal(classifyTurnEnd('').text, 'Turn finished.');
  assert.equal(classifyTurnEnd('x\nATTENTION: critical — y').type, 'critical');
});

test('Claude notifications: permission prompts ask, idle reminders stay silent', () => {
  assert.equal(classifyClaudeNotification({ notification_type: 'permission_prompt', message: 'Allow Bash?' }).type, 'question');
  assert.equal(classifyClaudeNotification({ notification_type: 'idle_prompt', message: 'waiting' }), null);
  assert.equal(classifyClaudeNotification({ message: 'Claude needs your permission to use Bash' }).type, 'question');
  assert.equal(classifyClaudeNotification({ message: 'Claude is waiting for your input' }), null);
});

test('lastAssistantText reads the final assistant text from a JSONL transcript', () => {
  const file = path.join(tmpDir(), 't.jsonl');
  fs.writeFileSync(file, [
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'first' }] } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'final answer' }, { type: 'tool_use' }] } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use' }] } }),
    JSON.stringify({ type: 'user', message: { content: 'ok' } }),
    '',
  ].join('\n'));
  assert.equal(lastAssistantText(file), 'final answer');
  assert.equal(lastAssistantText('/missing/file.jsonl'), '');
});

test('adapters map hook payloads to events', () => {
  const stop = fromClaudeHook('stop', { session_id: 's', cwd: '/p', last_assistant_message: 'ATTENTION: critical — go?' }, {});
  assert.equal(stop.type, 'critical');
  assert.equal(fromClaudeHook('stop', { stop_hook_active: true }, {}), null);
  assert.equal(fromClaudeHook('prompt', { session_id: 's' }, { ATTN_TMUX: 'attn-a' }).tmux, 'attn-a');
  const codex = fromCodexNotify({ type: 'agent-turn-complete', 'thread-id': 't', 'last-assistant-message': 'done' }, { ATTN_TMUX: 'attn-c' });
  assert.equal(codex.sessionId, 'attn-c');
  assert.equal(codex.type, 'complete');
  assert.equal(fromCodexNotify({ type: 'other' }, {}), null);
});

test('a critical question re-alerts once, then expires and parks the session', () => {
  const state = emptyState();
  assert.equal(applyEvent(state, { type: 'critical', agent: 'claude', sessionId: 's', text: 'Delete?' }, 0, timings).notify, true);
  assert.deepEqual(applyTick(state, 29 * MIN, timings), []);
  const reminder = applyTick(state, 30 * MIN, timings);
  assert.equal(reminder.length, 1);
  assert.equal(reminder[0].reminder, true);
  assert.deepEqual(applyTick(state, 60 * MIN, timings), []);
  const expired = applyTick(state, 120 * MIN, timings);
  assert.equal(expired[0].type, 'expired');
  assert.equal(state.pending.s.status, 'expired');
  assert.equal(state.sessions.s.status, 'parked');
  assert.deepEqual(applyTick(state, 200 * MIN, timings), []);
});

test('any new activity answers an open question and stops reminders', () => {
  const state = emptyState();
  applyEvent(state, { type: 'critical', agent: 'claude', sessionId: 's', text: 'Delete?' }, 0, timings);
  applyEvent(state, { type: 'prompt', sessionId: 's' }, 5 * MIN, timings);
  assert.equal(state.pending.s.status, 'answered');
  assert.deepEqual(applyTick(state, 31 * MIN, timings).map((e) => e.type), []);
});

test('quick turns skip the completion alert; long turns and process exits notify', () => {
  const state = emptyState();
  applyEvent(state, { type: 'prompt', agent: 'claude', sessionId: 's' }, 0, timings);
  assert.equal(applyEvent(state, { type: 'complete', sessionId: 's' }, 20_000, timings).notify, false);
  applyEvent(state, { type: 'prompt', sessionId: 's' }, 0, timings);
  assert.equal(applyEvent(state, { type: 'complete', sessionId: 's' }, 5 * MIN, timings).notify, true);
  applyEvent(state, { type: 'launch', agent: 'codex', sessionId: 'c' }, 0, timings);
  assert.equal(applyEvent(state, { type: 'complete', sessionId: 'c', final: true }, 1000, timings).notify, true);
});

test('a working session with no activity is reported as stalled once', () => {
  const state = emptyState();
  applyEvent(state, { type: 'activity', agent: 'claude', sessionId: 's' }, 0, timings);
  applyEvent(state, { type: 'launch', agent: 'claude', sessionId: 'attn-x' }, 0, timings);
  const due = applyTick(state, 31 * MIN, timings);
  assert.deepEqual(due.map((e) => [e.type, e.sessionId]), [['stalled', 's']]);
  assert.deepEqual(applyTick(state, 62 * MIN, timings), []);
  applyEvent(state, { type: 'activity', sessionId: 's' }, 63 * MIN, timings);
  assert.equal(applyTick(state, 94 * MIN, timings).length, 1);
});

test('pane watching answers Codex questions only after a settled baseline', () => {
  const state = emptyState();
  let pane = 'a';
  const capture = () => pane;
  applyEvent(state, { type: 'launch', agent: 'codex', sessionId: 'attn-c', tmux: 'attn-c' }, 0, timings);
  applyEvent(state, { type: 'critical', sessionId: 'attn-c', text: 'Go?' }, 60_000, timings);
  pane = 'question rendered';
  watchPanes(state, 62_000, timings, capture); // Within grace: baseline only.
  assert.equal(state.pending['attn-c'].status, 'open');
  watchPanes(state, 92_000, timings, capture); // Unchanged: still open.
  assert.equal(state.pending['attn-c'].status, 'open');
  pane = 'user typed an answer';
  watchPanes(state, 122_000, timings, capture);
  assert.equal(state.pending['attn-c'].status, 'answered');
  assert.equal(state.sessions['attn-c'].status, 'working');
});

test('dispatch never throws and honours dry run', async () => {
  const dir = tmpDir();
  const config = resolveConfig({});
  const event = { type: 'failure', agent: 'codex', sessionId: 'x', cwd: '/p', text: 'boom' };
  const results = await dispatch(event, {
    config, stateDir: dir,
    channels: { ok: async () => ({ sent: true }), bad: async () => { throw new Error('offline'); } },
  });
  assert.deepEqual(results, [{ sent: true }, { error: 'offline' }]);
  assert.match(fs.readFileSync(path.join(dir, 'errors.log'), 'utf8'), /offline/);
  const dry = await dispatch(event, { config: { ...config, dryRun: true }, stateDir: dir });
  assert.equal(dry[0].channel, 'dry-run');
  assert.equal(dry[0].alert.sound, 'falling');
});

test('alerts that fire together are spaced apart and keep their order', async () => {
  const dir = tmpDir();
  assert.equal(reserveAlertSlot(dir, 3_000, 1_000), 1_000);
  assert.equal(reserveAlertSlot(dir, 3_000, 1_000), 4_000);
  assert.equal(reserveAlertSlot(dir, 3_000, 2_000), 7_000);
  assert.equal(reserveAlertSlot(dir, 3_000, 60_000), 60_000);
  assert.equal(reserveAlertSlot(dir, 0, 60_500), 60_500);

  const config = resolveConfig({});
  const waits = []; const sent = [];
  const channels = { phone: async (alert) => { sent.push(alert.sound); return { sent: true }; } };
  const event = (type) => ({ type, agent: 'claude', sessionId: 's', cwd: '/p', text: type });
  const other = tmpDir();
  for (const type of ['critical', 'question', 'complete']) {
    await dispatch(event(type), { config, stateDir: other, channels, sleep: async (ms) => { waits.push(ms); } });
  }
  assert.deepEqual(sent, ['cosmic', 'magic', 'bike']);
  assert.equal(waits.length, 2);
  for (const ms of waits) assert.ok(ms > 2_000 && ms <= 3_000 * 2, `unexpected wait ${ms}`);
});

test('handleEvent and runTick persist state and write an expiry handoff', async () => {
  const dir = tmpDir();
  const config = resolveConfig({}, { ATTN_DRY_RUN: '1' });
  await handleEvent({ type: 'critical', agent: 'claude', sessionId: 's', cwd: '/p', text: 'Wipe cache?' }, { config, stateDir: dir, now: 0 });
  const due = await runTick({ config, stateDir: dir, now: 121 * MIN });
  assert.equal(due[0].type, 'expired');
  assert.equal(readState(dir).pending.s.status, 'expired');
  assert.equal(fs.readdirSync(path.join(dir, 'handoffs')).length, 1);
  assert.match(fs.readFileSync(path.join(dir, 'outbox.log'), 'utf8'), /expired/);
});

test('formatAlert names the agent, project and tmux attach command', () => {
  const alert = formatAlert({ type: 'critical', agent: 'codex', cwd: '/w/REZANOVA', tmux: 'attn-a', text: 'Go?' }, { daemonAlive: false });
  assert.equal(alert.title, 'Critical decision needed · Codex · REZANOVA');
  assert.match(alert.message, /tmux attach -t attn-a/);
  assert.match(alert.message, /daemon is not running/);
});

test('Claude hook install is idempotent and keeps foreign hooks', () => {
  const paths = { nodePath: '/usr/bin/node', attnPath: '/r/tools/agent-attention/attn.mjs' };
  const foreign = { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'say done' }] }] }, model: 'x' };
  const once = addClaudeHooks(foreign, paths);
  const twice = addClaudeHooks(once, paths);
  assert.deepEqual(twice, once);
  assert.equal(once.hooks.Stop.length, 2);
  assert.equal(once.hooks.PostToolUse[0].matcher, '*');
  assert.deepEqual(removeClaudeHooks(once), foreign);
});

test('Codex notify block is added at the top and refuses to clobber a foreign notify', () => {
  const paths = { nodePath: '/usr/bin/node', attnPath: '/r/attn.mjs' };
  const base = 'model = "x"\n\n[agents]\nenabled = true\n';
  const added = addCodexNotify(base, paths);
  assert.match(added.split('\n')[1], /^notify = \["\/usr\/bin\/node","\/r\/attn.mjs","hook","codex"\]$/);
  assert.equal(addCodexNotify(added, paths), added);
  assert.equal(removeCodexNotify(added), base);
  assert.throws(() => addCodexNotify('notify = ["say"]\n', paths), /already sets its own/);
  assert.doesNotThrow(() => addCodexNotify('[tui]\nnotify = true\n', paths));
});

test('launch helpers quote commands and classify exits', () => {
  assert.equal(shellQuote("it's"), `'it'\\''s'`);
  assert.equal(guessAgent(['/usr/local/bin/codex', 'exec']), 'codex');
  const { session, args } = buildLaunchArgs({ name: 'fix bug', command: ['codex', 'do it'], cwd: '/r', nodePath: '/n', attnPath: '/a.mjs' });
  assert.equal(session, 'attn-fix-bug');
  assert.equal(args.at(-1), "ATTN_TMUX=attn-fix-bug /n /a.mjs run-wrapped attn-fix-bug -- codex 'do it'");
  assert.equal(exitEvent({ session, agent: 'codex', code: 0 }).type, 'complete');
  assert.match(exitEvent({ session, agent: 'codex', code: null, signal: 'SIGKILL' }).text, /SIGKILL/);
  assert.match(systemdUnit({ nodePath: '/n', attnPath: '/a b.mjs' }), /ExecStart="\/n" "\/a b.mjs" daemon/);
});
