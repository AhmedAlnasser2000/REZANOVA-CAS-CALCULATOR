import path from 'node:path';

// An agent flags a blocking message by ending it with a line such as
//   ATTENTION: critical — Should I delete the old migration table?
// Markdown emphasis around the keyword is tolerated.
const MARKER = /^[\s>*_`-]*ATTENTION[*_`]*\s*:\s*[*_`]*(critical|question)[*_`]*\s*(?:[—–:-]\s*)?(.*)$/i;
const MARKER_TAIL_LINES = 8;

export function parseMarker(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const lines = text.trimEnd().split(/\r?\n/).slice(-MARKER_TAIL_LINES);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const match = lines[index].match(MARKER);
    if (match) {
      return { level: match[1].toLowerCase(), text: match[2].replace(/[*_`]+$/, '').trim() };
    }
  }
  return null;
}

export function summarize(text, limit = 280) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}

export function classifyTurnEnd(message) {
  const marker = parseMarker(message);
  if (marker) return { type: marker.level, text: marker.text || summarize(message) };
  return { type: 'complete', text: summarize(message) || 'Turn finished.' };
}

// Claude Code sends Notification hooks for permission prompts, elicitation dialogs
// and a delayed "waiting for your input" reminder. The reminder repeats what the
// Stop hook already reported, so it stays silent.
export function classifyClaudeNotification(payload) {
  const kind = payload?.notification_type;
  const message = String(payload?.message ?? '');
  if (kind === 'permission_prompt' || kind === 'elicitation_dialog') return { type: 'question', text: message };
  if (kind === 'idle_prompt' || kind === 'auth_success') return null;
  if (/permission/i.test(message)) return { type: 'question', text: message };
  return null;
}

export function projectName(cwd) {
  return cwd ? path.basename(cwd) : 'unknown project';
}

export function formatAlert(event, { daemonAlive = true } = {}) {
  const agent = event.agent === 'codex' ? 'Codex' : event.agent === 'claude' ? 'Claude' : event.agent;
  const label = {
    critical: 'Critical decision needed',
    question: 'Question',
    failure: 'Agent failed',
    stalled: 'Agent may be stuck',
    complete: 'Task finished',
    expired: 'Critical question expired — agent parked',
  }[event.type] ?? event.type;
  const title = `${event.reminder ? 'Reminder: ' : ''}${label} · ${agent} · ${projectName(event.cwd)}`;
  const lines = [summarize(event.text, 900) || '(no details)'];
  if (event.tmux) lines.push(`Attach: tmux attach -t ${event.tmux}`);
  if (event.type === 'critical' && !daemonAlive) lines.push('Note: the attention daemon is not running, so no reminder will follow.');
  return { title, message: lines.join('\n') };
}
