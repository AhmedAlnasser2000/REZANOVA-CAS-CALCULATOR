# REZANOVA Agent Attention (v1)

Start an agent, stop watching it, and get told only when something matters. Why this exists: [`docs/workflow/agent-attention-brief.md`](../../docs/workflow/agent-attention-brief.md).

It is a development tool only. The calculator app never imports it. It uses plain Node (24.x or 22.x) with no dependencies.

## What reaches you

| Event | When | Reminder |
|---|---|---|
| Critical decision | the agent ends its turn with `ATTENTION: critical — …` | re-alert after 30 min; after 2 h marked **expired** |
| Question | `ATTENTION: question — …`, or a Claude Code permission prompt | once |
| Failure | an agent started with `attn launch` exits with an error or is killed | once |
| Possibly stuck | a working agent shows no activity for 30 min | once |
| Task finished | a turn ends without a marker (turns under 60 s stay quiet: you were probably watching) | once |
| Routine work | tool calls, progress | never |

When a critical question expires, nothing is approved on your behalf. The agent was already stopped by its own turn end. It stays stopped, a handoff note is written, and you resume it when you're back.

An answer is detected automatically for Claude Code (your next prompt or tool approval) and for Codex started through `attn launch` (its terminal changes). For Codex started without `attn launch`, run `attn ack` if you answered before a reminder would fire.

## Setup (Linux PC)

1. **Install from a dedicated checkout.** The hooks point at this file's path, so it must stay present even when your main checkout switches branches:
   ```bash
   git worktree add ~/agent-attention rezanova-agent-attention
   alias attn="node ~/agent-attention/tools/agent-attention/attn.mjs"   # add to ~/.bashrc
   ```
2. **Pushover on the iPhone:** install the Pushover app (one-time purchase after the trial). Create an application at pushover.net to get an **API token**; your **user key** is on the pushover.net dashboard.
3. **Install:**
   ```bash
   attn install
   ```
   This does three things:
   - adds hooks to `~/.claude/settings.json` (a timestamped backup is kept);
   - adds `notify` to `~/.codex/config.toml`;
   - enables the `rezanova-agent-attention` systemd user service, which handles reminders, expiry and stall checks.

   It also creates `~/.config/rezanova-agent-attention/config.json`. Put the token and user key there. That file stays on your PC and never goes in git.
4. Restart any open Claude Code or Codex sessions, then run `attn test` to receive one sample alert of each type.

`attn uninstall` removes the hooks and the service and keeps your config.

## Daily use

```bash
attn launch fix-integrals -- codex          # or: -- claude, -- codex exec "…"
attn status                                 # open questions, sessions, daemon health
attn ack [session|all]                      # mark questions as handled
```

`attn launch` runs the agent inside tmux session `attn-<name>`, so you can close VS Code or the terminal. Every alert carries `tmux attach -t attn-<name>`. Claude Code run in VS Code or a plain terminal works through its hooks without `attn launch`. You only lose crash detection there.

## Sounds (to be chosen later)

Each event has its own Pushover sound in `config.json → events.<type>.sound`. The defaults are gentle placeholders (`cosmic`, `magic`, `falling`, `pianobar`, `bike`, `intermission`). Harsh sounds such as siren are deliberately avoided. Try them with `attn test <type>`. Pushover also accepts custom uploaded sounds by name.

## Replying from the phone later (not in v1)

v1 only notifies. The safe path to answer remotely, once wanted:
- Tailscale on the PC and iPhone, so SSH is only reachable from your own devices. **Never open SSH to the public internet.**
- An iOS SSH app (Termius or Blink) with a key locked behind Face ID.
- `tmux attach -t attn-<name>` to answer the agent directly.

## Limits of v1

- Codex's `notify` fires only when a turn completes. A Codex approval prompt is caught as "possibly stuck" only for sessions started with `attn launch`.
- A long-running command (for example a full test suite) can trigger a "possibly stuck" alert.
- Reminders, expiry and stall checks need the daemon. If the daemon is down, alerts still go out, and critical alerts say that no reminder will follow.

## Development

- `npm run test:agent-attention` runs the unit tests.
- Setting `ATTN_DRY_RUN=1` writes alerts to `outbox.log` instead of sending them.
- `ATTN_STATE_DIR` and `ATTN_CONFIG_DIR` redirect where state and config are kept.
