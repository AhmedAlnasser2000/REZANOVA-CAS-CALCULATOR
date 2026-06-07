# CALCULUS-WORKSPACE-MERGE1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Implemented `CALCULUS-WORKSPACE-MERGE1` as a product-surface merge. The launcher now exposes one visible `Calculus` entry, the old `Basics` section is removed, and the unified Calculus hub routes users into Derivatives, Integrals, Limits, Series, Differential Equations, and Partials.

## Completed

- Replaced separate visible Calculus and Advanced Calc launcher entries with one `Calculus` entry.
- Removed the visible `Basics` section from the unified Calculus hub.
- Added a `Derivatives` section containing `Derivative` and `Derivative at Point`.
- Routed `Integrals`, `Limits`, `Series`, `Differential Equations`, and `Partials` to the existing advanced-calculus tool implementations through the unified Calculus surface.
- Updated calculate navigation, soft-key routing, keypad/window key routing, breadcrumbs, footers, workspace labels, badges, and empty-state wording.
- Kept `advancedCalculus` as an internal/legacy mode and replay identifier for compatibility.
- Merged advanced calculus guide articles under the visible Calculus guide domain while keeping old article IDs and legacy domain lookup stable.
- Updated UI and unit coverage for launcher, guide, navigation, history replay, and advanced-calculus internals.

## Preserved Boundaries

- No solver capability changed.
- No `src/lib/advanced-calc/*` engine deletion or rename was attempted.
- No OOE worker shell migration or launch-ticket adoption for Calculus.
- No result schema or history schema behavior changed beyond forward mapping labels to the visible Calculus surface.

## Follow-Up

- RS32 or a later OOE milestone should evaluate the unified Calculus workspace after this surface merge instead of treating old Basic Calculus and Advanced Calc as separate product destinations.
- A later engine-consolidation milestone may rename internal files only after compatibility and replay constraints are re-audited.
