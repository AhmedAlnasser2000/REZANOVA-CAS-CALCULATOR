# AGENT-ATTENTION-V1

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Authority and outcome

- Date: 2026-09-28. The user approved the plan in plan mode after deciding each point by questionnaire. Route: DIRECT, root-only, no subagents. Work is on branch `rezanova-agent-attention`, not main.
- Gate type: backend (development tooling plus workflow policy). Outcome: **verified** in the cloud container with dry-run delivery. Delivery to the real device is still pending on the user's PC.

## Delivered

- `tools/agent-attention/attn.mjs` CLI: `install`/`uninstall`, `launch`, `daemon`, `status`, `ack`, `test`, and `hook claude|codex`.
- `core/` modules:
  - config and state (locked, atomic JSON);
  - the marker classifier;
  - Claude/Codex adapters (transcript tail, Codex notify JSON);
  - the event model (re-alert 30 min, expiry 2 h, stall 30 min, quick-turn completion suppression under 60 s);
  - Pushover and notify-send channels, with a dispatcher that never throws;
  - the tmux launcher and Codex pane watcher;
  - pure installer transforms for `~/.claude/settings.json`, `~/.codex/config.toml` and the systemd user unit.
- `AGENTS.md` gains an "Agent Attention Signals" section (`ATTENTION: critical|question — …`; silence is never approval).
- The brief's section 5 now records the v1 decisions. The README covers setup, the future SSH path, and v1 limits.
- `npm run test:agent-attention` was added. It is not part of `test:gate`.

## Deviations from the plan

- The dispatch/handler logic lives in `core/events.mjs` plus `core/adapters.mjs` rather than a single handlers file.
- A Claude hook error is not a failure source. Failures come from `attn launch` exit status only.
- Quick-turn completion suppression (60 s) was added so live chatting does not ping the phone.

## Still open

- Sound set: gentle placeholders only; to be chosen with the user.
- Phone replies (SSH/Tailscale/tmux) are documented only.
- Real Pushover delivery must be checked on the user's PC.
