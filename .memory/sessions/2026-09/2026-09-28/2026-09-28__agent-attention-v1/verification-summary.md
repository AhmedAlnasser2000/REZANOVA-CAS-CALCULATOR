# AGENT-ATTENTION-V1 verification

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

## Evidence (cloud container, Node 22.22.2, tmux 3.4)

- `node --test tools/agent-attention/agent-attention.test.mjs`: 16/16 pass. Coverage:
  - markers and notification classes;
  - transcript tail;
  - re-alert, expiry and parking;
  - answer clearing;
  - quick-turn suppression;
  - stall once-only;
  - the pane-watch grace baseline;
  - dispatch failure isolation and dry run;
  - persisted expiry handoff;
  - idempotent install/uninstall that keeps foreign hooks, and refuses to overwrite a foreign Codex `notify`;
  - launch quoting and exit classification.
- Dry-run smoke through the real CLI:
  - Claude prompt then Stop with a critical marker, read from a JSONL transcript: a critical alert noting the daemon is down;
  - Codex notify: a completion alert;
  - an idle_prompt notification: silent;
  - `attn launch demo -- sh -c 'exit 3'`: a failure alert with the tmux attach hint;
  - the daemon with shortened timings: expiry alert and handoff file.
- Install/uninstall against a throwaway HOME: hooks added once, foreign settings kept, Codex block at the top, and uninstall restores both files byte-for-byte. The systemd bus is unavailable in the container, so the fallback message path ran.
- `node tools/validate-codex-agent-workflow.mjs` passes with the new AGENTS.md section. Memory-protocol, file-size and `git diff --check` results are recorded in the commit log.
- Not run: `npm run` scripts, which are blocked by the Node 24 engine check in this container; they were run directly with `node` instead. ESLint only covers ts/tsx, so the tool's `.mjs` is outside lint scope. No app-visible output changed, so no Playwright check was needed.
