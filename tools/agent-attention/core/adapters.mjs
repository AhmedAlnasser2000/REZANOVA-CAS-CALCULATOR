import fs from 'node:fs';

import { classifyClaudeNotification, classifyTurnEnd } from './classify.mjs';

const TRANSCRIPT_TAIL_BYTES = 512 * 1024;

function readTail(file, bytes) {
  const fd = fs.openSync(file, 'r');
  try {
    const { size } = fs.fstatSync(fd);
    const start = Math.max(0, size - bytes);
    const buffer = Buffer.alloc(size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    return buffer.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((part) => part?.type === 'text').map((part) => part.text).join('\n');
}

// Returns the text of the last assistant message in a Claude Code JSONL transcript.
export function lastAssistantText(transcriptPath) {
  let raw;
  try {
    raw = readTail(transcriptPath, TRANSCRIPT_TAIL_BYTES);
  } catch {
    return '';
  }
  const lines = raw.split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    let entry;
    try {
      entry = JSON.parse(lines[index]);
    } catch {
      continue; // The first line of the tail may be cut mid-record.
    }
    if (entry?.type !== 'assistant') continue;
    const text = textOf(entry.message?.content);
    if (text.trim()) return text;
  }
  return '';
}

// Maps one Claude Code hook invocation to an attention event (or null for no-op).
export function fromClaudeHook(hookName, payload, env = process.env) {
  const base = { agent: 'claude', sessionId: payload?.session_id ?? 'claude', cwd: payload?.cwd, tmux: env.ATTN_TMUX };
  switch (hookName) {
    case 'prompt':
      return { ...base, type: 'prompt' };
    case 'activity':
      return { ...base, type: 'activity' };
    case 'session-end':
      return { ...base, type: 'session-end' };
    case 'notification': {
      const classified = classifyClaudeNotification(payload);
      return classified ? { ...base, ...classified } : null;
    }
    case 'stop': {
      // Stop can re-fire while a Stop hook keeps Claude going; only the settled stop counts.
      if (payload?.stop_hook_active) return null;
      const message = payload?.last_assistant_message ?? lastAssistantText(payload?.transcript_path);
      return { ...base, ...classifyTurnEnd(message) };
    }
    default:
      return null;
  }
}

// Maps the JSON argument Codex passes to its `notify` program.
export function fromCodexNotify(payload, env = process.env) {
  if (payload?.type !== 'agent-turn-complete') return null;
  const sessionId = env.ATTN_TMUX || payload['thread-id'] || 'codex';
  return {
    agent: 'codex',
    sessionId,
    cwd: payload.cwd ?? env.PWD,
    tmux: env.ATTN_TMUX,
    ...classifyTurnEnd(payload['last-assistant-message'] ?? ''),
  };
}
