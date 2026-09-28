import { shellQuote } from './launch.mjs';

export const HOOK_TAG = 'agent-attention/attn.mjs';

const CLAUDE_HOOKS = {
  UserPromptSubmit: 'prompt',
  PostToolUse: 'activity',
  Notification: 'notification',
  Stop: 'stop',
  SessionEnd: 'session-end',
};

function isOurs(group) {
  return Array.isArray(group?.hooks) && group.hooks.some((hook) => String(hook?.command ?? '').includes(HOOK_TAG));
}

// Removes our hook groups from ~/.claude/settings.json content, keeping everything else.
export function removeClaudeHooks(settings) {
  const next = structuredClone(settings ?? {});
  if (!next.hooks) return next;
  for (const [event, groups] of Object.entries(next.hooks)) {
    if (!Array.isArray(groups)) continue;
    const kept = groups.filter((group) => !isOurs(group));
    if (kept.length) next.hooks[event] = kept;
    else delete next.hooks[event];
  }
  if (!Object.keys(next.hooks).length) delete next.hooks;
  return next;
}

export function addClaudeHooks(settings, { nodePath, attnPath }) {
  const next = removeClaudeHooks(settings);
  next.hooks ??= {};
  for (const [event, name] of Object.entries(CLAUDE_HOOKS)) {
    const command = `${shellQuote(nodePath)} ${shellQuote(attnPath)} hook claude ${name}`;
    const group = { hooks: [{ type: 'command', command, timeout: 15 }] };
    if (event === 'PostToolUse') group.matcher = '*';
    next.hooks[event] = [...(next.hooks[event] ?? []), group];
  }
  return next;
}

const CODEX_BEGIN = '# >>> rezanova-agent-attention >>>';
const CODEX_END = '# <<< rezanova-agent-attention <<<';

export function removeCodexNotify(toml) {
  const pattern = new RegExp(`${CODEX_BEGIN}[\\s\\S]*?${CODEX_END}\\n?`, 'g');
  return toml.replace(pattern, '');
}

function hasForeignTopLevelNotify(toml) {
  for (const line of removeCodexNotify(toml).split('\n')) {
    if (/^\s*\[/.test(line)) return false; // Top-level keys end at the first table.
    if (/^\s*notify\s*=/.test(line)) return true;
  }
  return false;
}

// `notify` must be a top-level key, so the block goes at the very start of the file.
export function addCodexNotify(toml, { nodePath, attnPath }) {
  if (hasForeignTopLevelNotify(toml)) {
    throw new Error('~/.codex/config.toml already sets its own `notify`. Remove it or chain it manually, then re-run install.');
  }
  const value = JSON.stringify([nodePath, attnPath, 'hook', 'codex']);
  return `${CODEX_BEGIN}\nnotify = ${value}\n${CODEX_END}\n${removeCodexNotify(toml)}`;
}

export function systemdUnit({ nodePath, attnPath }) {
  return [
    '[Unit]',
    'Description=REZANOVA Agent Attention daemon (reminders, expiry, stall checks)',
    '',
    '[Service]',
    `ExecStart="${nodePath}" "${attnPath}" daemon`,
    'Restart=always',
    'RestartSec=5',
    '',
    '[Install]',
    'WantedBy=default.target',
    '',
  ].join('\n');
}
