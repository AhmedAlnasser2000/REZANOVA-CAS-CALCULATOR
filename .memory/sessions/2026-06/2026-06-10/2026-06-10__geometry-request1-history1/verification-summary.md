# GEOMETRY-REQUEST1 + GEOMETRY-HISTORY1 Verification Summary

status: completed
date: 2026-06-10
primary_agent: codex
primary_agent_model: gpt-5.5
attribution_basis: live

## What Changed

- Added `GeometryReplaySeed` and optional completed-history `geometrySeed`.
- Added app-state schema validation for every current `GeometryRequest` variant.
- Added Rust persisted History support for `geometry_seed`.
- New Geometry runs now commit parsed `geometrySeed` data when a draft parses successfully.
- Geometry history replay now prefers typed seeds and serializes the stored request back into structured draft text.
- Legacy seedless Geometry history remains compatible through the existing `geometryScreen` and `inputLatex` reparsing path.

## Verification

Passed:

```bash
npm run test:unit -- src/lib/app-state/history-schema.test.ts src/lib/geometry/parser.test.ts src/lib/geometry/core.test.ts
npm run test:unit -- src/lib/geometry/*.test.ts src/lib/app-state/history-schema.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx src/components/HistoryPanel.ui.test.tsx
npm run test:memory-protocol
npm run lint
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Behavior Impact

Geometry user-facing workflows and solver behavior are unchanged. Completed Geometry history records are now more durable because they can replay from a typed request seed rather than relying only on screen hints and raw text.

## Deferred

- `GEOMETRY-OOE-PILOT1`
- `GEOMETRY-RUNTIME-SHELL1`
- Geometry launch tickets
- Geometry worker runtime shell
