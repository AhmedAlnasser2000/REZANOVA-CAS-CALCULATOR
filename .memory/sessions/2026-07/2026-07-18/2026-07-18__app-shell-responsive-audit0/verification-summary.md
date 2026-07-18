# APP-SHELL-RESPONSIVE-AUDIT0 verification summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- gate_type: ui
- date: 2026-07-18

## Evidence

- Source review: `useSideSurfaceRuntime.ts` uses a 1180px viewport gate, a fixed
  400px panel plus 24px gap, and `getBoundingClientRect()` slack measurement;
  `shell.css` applies calculator UI Scale through CSS `zoom`.
- Browser matrix: Chromium at 1440x1000, 1920x1000, and 2560x1000; Settings at
  100%, 115%, 130%, and 145% UI Scale. The only outboard sample was 2560px at
  100%; every other sampled state was overlay with the 46% backdrop.
- Visual captures and raw matrix are ignored under
  `.task_tmp/app-shell-responsive-audit0/`.

## Scope integrity

- No production, test, Graphing, OOE, or result-contract files were changed.
- The active Equation/result-contract worktree changes remain excluded.
