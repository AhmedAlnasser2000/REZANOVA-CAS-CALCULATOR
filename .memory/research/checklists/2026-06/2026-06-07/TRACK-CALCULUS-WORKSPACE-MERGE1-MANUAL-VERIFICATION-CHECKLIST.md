# TRACK-CALCULUS-WORKSPACE-MERGE1 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Verify `CALCULUS-WORKSPACE-MERGE1: Unified Calculus Surface`.

This checklist covers the user-facing merge of `Calculus` and `Advanced Calc` into one visible `Calculus` workspace. It preserves the existing advanced-calculus engine and legacy `advancedCalculus` identifiers for replay/guide compatibility. It does not delete `src/lib/advanced-calc/*`, migrate Calculus to OOE worker shells, add History launch tickets for Calculus, or change solver capability.

## Manual Checks

- Open the launcher and confirm there is exactly one visible `Calculus` entry and no visible `Advanced Calc` entry.
- Open `Calculus` and confirm the visible sections are `Derivatives`, `Integrals`, `Limits`, `Series`, `Differential Equations`, and `Partials`.
- Confirm there is no visible top-level `Basics` section.
- Open `Derivatives` and confirm it contains `Derivative` and `Derivative at Point`.
- Open `Integrals` and confirm indefinite, definite, and improper workflows are available.
- Open `Limits` and confirm finite-target and infinite-target workflows are available.
- Open `Series`, `Differential Equations`, and `Partials` and confirm their former Advanced Calc tools remain reachable.
- Replay a legacy `advancedCalculus` history item and confirm it opens under the visible `Calculus` wording.
- Open Guide > Calculus and confirm advanced calculus articles appear under the Calculus domain while old article IDs still resolve.

## Internal Checks

- Confirm `src/lib/advanced-calc/*` remains an implementation/internal engine path.
- Confirm the internal `advancedCalculus` mode/schema/history identifiers remain compatible for legacy replay.
- Confirm launcher labels, guide labels, badges, breadcrumbs, empty states, and history labels use `Calculus` rather than `Advanced Calc`.
- Confirm OOE remains unchanged for Calculus in this milestone.

## Regression Boundaries

- No solver behavior changes.
- No result schema changes.
- No engine deletion or file-renaming campaign.
- No Calculus worker-shell migration.
- No Calculus launch-ticket adoption.
- No new calculus capability.
