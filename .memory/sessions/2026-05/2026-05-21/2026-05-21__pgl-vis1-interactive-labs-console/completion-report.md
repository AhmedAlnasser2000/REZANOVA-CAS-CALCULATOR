# PGL-VIS1 Interactive Labs Console Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Goal
- Build the first developer-only interactive Labs console for visually running approved Playground experiments without making Playground product behavior.

## Completed Work
- Added a Vite dev-server Labs runner bridge gated by `VITE_SHOW_LABS=1` and `VITE_ENABLE_LAB_RUNNERS=1`.
- Upgraded `LabsPanel` with a runner selector, input-kind controls, MathLive editor, corpus-case picker, run button, result summary, comparison table, warnings, and raw envelope details.
- Added typed runner metadata/request/result envelopes under `src/lib/labs/`.
- Added the `expression-baseline-probe` Playground record, manifest, lab test, and generated Labs catalog entry.
- Preserved the one-way boundary: stable runtime Labs files still do not import or dynamically load `playground/`.

## Boundaries Preserved
- No product math behavior changed.
- No normal history/provenance integration was added.
- No remote compute, SSH controls, FriCAS execution, source-mirror execution, or release-build runner execution was added.
- No commit has been made yet; commit remains pending explicit user approval.

## Files Of Interest
- `src/components/LabsPanel.tsx`
- `src/lib/labs/runner-types.ts`
- `src/lib/labs/runner-registry.ts`
- `src/lib/labs/runner-client.ts`
- `tools/labs-runner-dev-plugin.ts`
- `playground/level-0-research/expression-baseline-probe/`
- `.memory/research/checklists/2026-05/2026-05-21/TRACK-PGL-VIS1-MANUAL-VERIFICATION-CHECKLIST.md`
