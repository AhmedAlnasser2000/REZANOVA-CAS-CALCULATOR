# TRACK-OOE-RS32 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Verify `OOE-RS32: Canonical Calculus Runtime Shell And Tickets`.

This checklist covers the migration of the unified Calculus workspace onto the shared OOE runtime-shell and launch-ticket model. It makes `calculus` / `calculus.evaluate` the canonical new identity while keeping legacy `advancedCalculus` history, guide launches, and replay metadata loadable. It does not rename `src/lib/advanced-calc/*`, migrate other workspaces, add solver capability, or change Rust solver execution.

## Manual Checks

- Open the launcher and confirm there is one visible `Calculus` workspace and no visible `Advanced Calc` entry.
- Start an explicit Calculus run and confirm the display header changes from `Ready` to `Computing`.
- Open History while the Calculus run is pending and confirm a pending `Calculus` row appears with `Running` plus a `Stop` action.
- Confirm the pending Calculus row has no replay/delete actions until it finalizes.
- Switch to another workspace while Calculus is running and confirm navigation, scrolling, and controls remain usable.
- Let the Calculus job finish in the background and confirm History finalizes the pending row in its launch-order position.
- Confirm background Calculus completion does not pull the user back to Calculus or overwrite the currently active workspace.
- Start another Calculus run and stop it from the header or pending History row; confirm the pending row is removed and no fake final History record is added.
- Replay a legacy `advancedCalculus` history item and confirm it opens in the unified visible Calculus workspace.
- Open the dev OOE diagnostics panel with `VITE_SHOW_OOE_DIAGNOSTICS=1` and confirm Calculus records show `calculus.evaluate`, runtime-shell evidence, selected host, and launch-ticket evidence.

## Internal Checks

- New Calculus History entries use `mode: calculus` plus canonical `calculusScreen` / `calculusSeed` replay fields.
- Legacy `advancedCalculus` entries parse and map forward to canonical `calculus` replay context.
- `calculus-worker-runtime` is the primary worker host and `calculus-runtime` is the init/unavailable fallback host.
- Worker init/unavailable failure records fallback evidence; worker runtime failure fails cleanly without silent main-thread retry.
- Cancellation keeps RS26+ semantics: transient stopped status only, no result-card commit, no History finalization, no `Ans` update, and no replay cleanup.
- `src/lib/advanced-calc/*` remains an implementation/internal engine path.

## Regression Boundaries

- No non-Calculus workspace migration.
- No universal History-ticket adoption.
- No scheduler rewrite.
- No public diagnostics expansion.
- No Rust solver execution.
- No new calculus or algebra capability.
- No physical advanced-calc folder rename.
