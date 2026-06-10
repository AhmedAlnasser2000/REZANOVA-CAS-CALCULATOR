# TRACK-GEOMETRY-REQUEST1-HISTORY1-MANUAL-VERIFICATION-CHECKLIST

status: completed
date: 2026-06-10
primary_agent: codex
primary_agent_model: gpt-5.5
attribution_basis: live

## Scope

`GEOMETRY-REQUEST1 + GEOMETRY-HISTORY1` adds a typed Geometry replay seed for completed History records. It does not add Geometry OOE launch tickets or a worker runtime shell.

## Manual Checks

- [x] Confirmed new Geometry records can carry `geometrySeed: { screen, request }`.
- [x] Confirmed `geometrySeed.request` uses the existing `GeometryRequest` union.
- [x] Confirmed ordinary structured Geometry requests round-trip through the serializer/parser.
- [x] Confirmed solve-missing Geometry requests round-trip through the serializer/parser.
- [x] Confirmed History replay prefers `geometrySeed` when present.
- [x] Confirmed legacy `geometryScreen` records remain compatible through reparsing `inputLatex`.
- [x] Confirmed app-state zod schemas accept typed Geometry seeds.
- [x] Confirmed Rust persisted History shape accepts `geometry_seed`.
- [x] Confirmed Geometry OOE runtime-shell and launch-ticket adoption remain deferred.

## Verification Commands

```bash
npm run test:unit -- src/lib/app-state/history-schema.test.ts src/lib/geometry/parser.test.ts src/lib/geometry/core.test.ts
npm run test:unit -- src/lib/geometry/*.test.ts src/lib/app-state/history-schema.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx src/components/HistoryPanel.ui.test.tsx
npm run test:memory-protocol
npm run lint
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Notes

This milestone intentionally keeps Geometry on its current runtime path. The point is to make future tickets honest: a pending Geometry row can later finalize into a completed record with a stable typed replay seed.
