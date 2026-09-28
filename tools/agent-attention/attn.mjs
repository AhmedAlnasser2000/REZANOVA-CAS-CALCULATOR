#!/usr/bin/env node
// REZANOVA Agent Attention: tells the user when an agent genuinely needs them.
// Development-side only; the calculator app never imports this.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fromClaudeHook, fromCodexNotify } from './core/adapters.mjs';
import { configPath, EVENT_TYPES, loadConfig, stateDir, writeDefaultConfig } from './core/config.mjs';
import { dispatch } from './core/dispatch.mjs';
import { handleEvent, isDaemonAlive, runTick } from './core/events.mjs';
import { addClaudeHooks, addCodexNotify, removeClaudeHooks, removeCodexNotify, systemdUnit } from './core/install.mjs';
import { buildLaunchArgs, exitEvent, guessAgent, runWrapped, watchPanes } from './core/launch.mjs';
import { appendLog, readState, withState } from './core/state.mjs';

const attnPath = fileURLToPath(import.meta.url);
const nodePath = process.execPath;
const USAGE = `Usage: attn <command>
  install | uninstall        add/remove Claude Code hooks, Codex notify, and the systemd user service
  launch <name> -- <cmd...>  run an agent in tmux session attn-<name>
  daemon                     run reminders, expiry and stall checks (the systemd service runs this)
  status                     show open questions, sessions and daemon health
  ack [session|all]          mark open questions as handled
  test [type]                send a sample alert (${EVENT_TYPES.join(', ')})
  hook claude <name> | hook codex <json>   called by the agents themselves`;

function context() {
  return { config: loadConfig(), stateDir: stateDir() };
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function parseJson(text) {
  try {
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
}

async function hook([agent, arg]) {
  // Hooks must never fail the agent: errors are logged and the exit code stays 0.
  const ctx = context();
  try {
    const event = agent === 'claude'
      ? fromClaudeHook(arg, parseJson(await readStdin()))
      : agent === 'codex' ? fromCodexNotify(parseJson(arg)) : null;
    if (event) await handleEvent(event, ctx);
  } catch (error) {
    appendLog(ctx.stateDir, 'errors.log', `hook ${agent} ${arg ?? ''}: ${error.stack ?? error.message}`);
  }
}

async function daemon() {
  const ctx = context();
  const tick = async () => {
    try {
      await runTick({ ...ctx, beforeTick: (state, now) => watchPanes(state, now, ctx.config.timings) });
    } catch (error) {
      appendLog(ctx.stateDir, 'errors.log', `daemon: ${error.stack ?? error.message}`);
    }
  };
  console.log(`Agent Attention daemon: state in ${ctx.stateDir}, tick every ${ctx.config.timings.daemonTickSeconds}s`);
  await tick();
  setInterval(tick, ctx.config.timings.daemonTickSeconds * 1000);
}

function launch(args) {
  const split = args.indexOf('--');
  const name = args[0];
  const command = split >= 0 ? args.slice(split + 1) : [];
  if (!name || split !== 1 || !command.length) throw new Error('Usage: attn launch <name> -- <command...>');
  const { session, args: tmuxArgs } = buildLaunchArgs({ name, command, cwd: process.cwd(), nodePath, attnPath });
  execFileSync('tmux', tmuxArgs, { stdio: 'inherit' });
  console.log(`Started ${command[0]} in tmux session ${session}.\nAttach: tmux attach -t ${session}   (detach again with Ctrl-b d)`);
}

async function runWrappedCommand([session, separator, ...command]) {
  if (separator !== '--' || !command.length) throw new Error('internal: run-wrapped <session> -- <cmd...>');
  const ctx = context();
  const agent = guessAgent(command);
  const cwd = process.cwd();
  await handleEvent({ type: 'launch', agent, sessionId: session, cwd, tmux: session }, ctx);
  const exit = await runWrapped(command, { onExit: (result) => result });
  await handleEvent(exitEvent({ session, agent, cwd, ...exit }), ctx);
  console.log(`\n[agent-attention] ${command[0]} ended (${exit.signal ?? `code ${exit.code}`}). Press Enter to close this window.`);
  await new Promise((resolve) => process.stdin.once('data', resolve));
  process.exit(0);
}

function backup(file) {
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak-${Date.now()}`);
}

function editFile(file, transform, fallback) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : fallback;
  const next = transform(current);
  if (next === current) return false;
  backup(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, next);
  return true;
}

function install(remove = false) {
  const home = os.homedir();
  const paths = { nodePath, attnPath };
  const claudeFile = path.join(home, '.claude', 'settings.json');
  const codexFile = path.join(home, '.codex', 'config.toml');
  const unitFile = path.join(home, '.config', 'systemd', 'user', 'rezanova-agent-attention.service');

  editFile(claudeFile, (text) => {
    const settings = JSON.parse(text || '{}');
    return `${JSON.stringify(remove ? removeClaudeHooks(settings) : addClaudeHooks(settings, paths), null, 2)}\n`;
  }, '{}');
  editFile(codexFile, (text) => (remove ? removeCodexNotify(text) : addCodexNotify(text, paths)), '');
  console.log(`${remove ? 'Removed hooks from' : 'Hooked'}: ${claudeFile}, ${codexFile}`);

  if (remove) {
    try {
      execFileSync('systemctl', ['--user', 'disable', '--now', 'rezanova-agent-attention'], { stdio: 'ignore' });
    } catch {
      // Service was not installed or systemd is unavailable.
    }
    fs.rmSync(unitFile, { force: true });
    console.log('Removed the systemd user service. Config and state were kept.');
    return;
  }

  fs.mkdirSync(path.dirname(unitFile), { recursive: true });
  fs.writeFileSync(unitFile, systemdUnit(paths));
  try {
    execFileSync('systemctl', ['--user', 'daemon-reload'], { stdio: 'ignore' });
    execFileSync('systemctl', ['--user', 'enable', '--now', 'rezanova-agent-attention'], { stdio: 'ignore' });
    console.log('Daemon enabled: systemctl --user status rezanova-agent-attention');
  } catch {
    console.log(`Wrote ${unitFile}; start it with: systemctl --user enable --now rezanova-agent-attention`);
  }
  if (writeDefaultConfig()) console.log(`Created ${configPath()} — add your Pushover token and user key there.`);
  console.log('Restart open Claude Code and Codex sessions so they pick up the hooks. Then run: attn test');
}

function status() {
  const { config, stateDir: dir } = context();
  const state = readState(dir);
  const now = Date.now();
  const age = (at) => (at ? `${Math.round((now - at) / 60_000)} min ago` : 'never');
  console.log(`Daemon: ${isDaemonAlive(state, now, config.timings) ? 'running' : 'NOT running'} (last beat ${age(state.daemonBeatAt)})`);
  console.log(`Pushover: ${config.pushover.token && config.pushover.user ? 'configured' : 'not configured'}${config.dryRun ? ' (dry run)' : ''}`);
  const open = Object.values(state.pending).filter((item) => item.status === 'open');
  console.log(`\nOpen questions (${open.length}):`);
  for (const item of open) console.log(`  [${item.level}] ${item.agent} ${item.sessionId} asked ${age(item.askedAt)}: ${item.text}`);
  console.log('\nSessions:');
  for (const [id, session] of Object.entries(state.sessions)) {
    if (session.status === 'ended') continue;
    console.log(`  ${session.agent} ${id} ${session.status} (active ${age(session.lastActivityAt)})${session.tmux ? ` tmux:${session.tmux}` : ''}`);
  }
}

function ack([target = 'all']) {
  const count = withState(stateDir(), (state) => {
    let changed = 0;
    for (const item of Object.values(state.pending)) {
      if (item.status !== 'open' || (target !== 'all' && item.sessionId !== target)) continue;
      Object.assign(item, { status: 'answered', closedAt: Date.now() });
      changed += 1;
    }
    return changed;
  });
  console.log(`Marked ${count} open question(s) as handled.`);
}

async function test([type]) {
  const ctx = context();
  const types = type ? [type] : EVENT_TYPES;
  for (const eventType of types) {
    if (!EVENT_TYPES.includes(eventType)) throw new Error(`Unknown type ${eventType}. Use one of: ${EVENT_TYPES.join(', ')}`);
    const results = await dispatch(
      { type: eventType, agent: 'claude', sessionId: 'test', cwd: process.cwd(), text: `Test ${eventType} alert from Agent Attention.` },
      ctx,
    );
    console.log(`${eventType}: ${JSON.stringify(results.map(({ alert, ...rest }) => rest))}`);
  }
}

const [command, ...rest] = process.argv.slice(2);
const commands = {
  hook: () => hook(rest),
  daemon,
  launch: () => launch(rest),
  'run-wrapped': () => runWrappedCommand(rest),
  install: () => install(false),
  uninstall: () => install(true),
  status,
  ack: () => ack(rest),
  test: () => test(rest),
};

if (!commands[command]) {
  console.log(USAGE);
  process.exit(command ? 1 : 0);
}
try {
  await commands[command]();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
