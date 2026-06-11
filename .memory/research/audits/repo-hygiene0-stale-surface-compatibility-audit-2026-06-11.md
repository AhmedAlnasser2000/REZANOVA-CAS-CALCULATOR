# REPO-HYGIENE0 Stale Surface And Compatibility Audit

Date: 2026-06-11
Status: read-only audit
Scope: stale-looking product surfaces, compatibility vocabulary, replay paths, guide routes, and internal reusable cores

## Boundary

`REPO-HYGIENE0` is audit-only. It does not delete code, change routing, alter schemas, migrate history, rename files, remove guide content, or refactor workspaces.

This audit also does not implement a bus, Surface Protocol, Supercarrier compartment system, plugin system, remote compute protocol, public SDK, OOE behavior change, solver behavior change, or display behavior change.

## Name Check

No existing `REPO-HYGIENE0` milestone was found. The nearest related name is `EQUATION-RESULT-HYGIENE1`, which is a different Equation result-surface polish milestone. Use `REPO-HYGIENE0` for this repo-wide stale-surface/compatibility audit.

## Classification Legend

- Active user-facing surface: visible current product UI or a currently launched runtime lane.
- Hidden but required legacy compatibility: not a preferred visible surface, but still required for persisted history, guide launches, replay, tests, or old route vocabulary.
- Internal reusable capability/core: implementation code that powers current or future surfaces even if its old UI was removed.
- Candidate stale/dead code needing proof: suspicious code that may be removable only after migration evidence and tests prove no current or legacy path needs it.
- Unsafe-to-delete until tests or migrations exist: code that looks stale but is entangled with schemas, replay, guide links, or runtime host compatibility.

## Active User-Facing Surfaces

- Calculate standard quickform remains visible and now owns broad one-shot expression evaluation. It should not become a guided calculus/trig workspace.
- Equation remains the relation/constraint solver, including symbolic selected-target solving, trig solving, inequalities, and complex Equation routes.
- Unified Calculus is the visible calculus workspace. It owns guided derivatives, integrals, limits, series, differential equations, and partials.
- Trigonometry is focused on identities, triangles, angle conversion, and Period & Phase. Direct trig evaluation and broad trig equation solving are no longer visible Trigonometry surfaces.
- Geometry remains a visible guided geometry workspace with typed `geometrySeed` replay and worker-shell runtime.
- Statistics, Matrix, Vector, and Table remain visible workspaces with their current focused product roles and OOE runtime shells where already migrated.

## Hidden But Required Legacy Compatibility

- `advancedCalculus` mode, guide, history, launch, and OOE vocabulary remains present in schemas and routing. New user-facing identity is `calculus`, but legacy records and guide examples still map forward into the unified Calculus workspace.
- `src/app/workspaces/AdvancedCalculusWorkspace.tsx` remains the implementation host for the unified Calculus surface even though the visible product wording is Calculus.
- `src/lib/advanced-calc/*` remains the internal calculus implementation backend. It is not stale merely because the visible `Advanced Calc` entry was removed.
- Trigonometry hidden `functions`, `equationsHome`, `equationSolve`, and `specialAngles` screens remain in schema/navigation/core/parser paths for legacy replay and guide compatibility. Current visible home excludes them, but old function/special-angle expression records route to Calculate and old trig equation records route to Equation.
- Guided Calculate calculus screens and `calculateScreen` values such as `calculusHome`, `derivative`, `derivativePoint`, `integral`, and `limit` remain in app-state schemas and replay/focus/runtime paths for legacy history compatibility. New Calculate records should be standard quickform or explicit Calculate runtime actions, not guided calculus records.
- `calculate.workbench` / `legacyWorkbench` remains compatibility vocabulary for old Calculate workbench paths and OOE provenance. It should not be deleted until old guide/replay paths and tests no longer need it.
- Guide article IDs and launch `targetMode: 'advancedCalculus'` entries remain compatibility vocabulary. Some launch handlers map them to visible `calculus`; article IDs should stay stable until a deliberate guide migration can preserve deep links.

## Internal Reusable Capability/Core

- `src/lib/advanced-calc/*` is an internal calculus engine/core area despite legacy naming.
- `src/lib/trigonometry/functions.ts`, `src/lib/trigonometry/equations.ts`, special-angle data, parser helpers, and serializer helpers remain reusable trig cores for Calculate, Equation handoff, Guide examples, and legacy replay.
- `src/lib/trigonometry/core.ts` dispatches typed trig requests, including hidden legacy requests and current `periodPhase` requests.
- Geometry parser/core/runtime files are active internal capabilities for the visible Geometry workspace and should not be judged by surface vocabulary alone.
- OOE workspace pilot compatibility records in `src/lib/ooe/workspace-pilot.ts` and `src-tauri/src/ooe/registry.rs` intentionally preserve route/capability evidence for migrated and legacy lanes.
- App-state schemas in `src/lib/app-state/schemas.ts` are compatibility contracts. Old enum values should stay until migrations and replay tests prove they can be removed.

## Candidate Stale Or Dead Code Needing Proof

- Any visible text still saying `Advanced Calc` in normal UI, if not part of compatibility tests, may be stale product wording. It needs a UI/guide wording audit before removal.
- Hidden Trigonometry menu metadata for `functions`, `equationsHome`, `equationSolve`, and `specialAngles` may eventually shrink if all legacy replay/guide routes move elsewhere, but removal is unsafe today.
- Guided Calculate calculus navigation metadata may become removable after all old history/guide/replay paths are migrated and tested against canonical Calculus routes.
- Old guide examples with `targetMode: 'advancedCalculus'` may eventually be rewritten to `calculus`, but deep-link/article compatibility should be preserved first.
- Duplicate compatibility tests or fixture names that still mention old surfaces may be stale only after the compatibility contract is retired.

## Unsafe To Delete Now

- `advancedCalculus` schema values, mode refs, and replay paths.
- `calculateScreen` legacy calculus values and replay seed schemas.
- `trigScreen` hidden legacy values and `trigSeed` compatibility paths.
- Guide article IDs such as `trig-functions`, `trig-equations`, and advanced-calculus article IDs.
- OOE compatibility capability IDs such as `advancedCalculus.evaluate` and `calculate.workbench`.
- Worker/pilot compatibility tests that validate old records still route forward.
- Internal reusable cores merely because their current visible workspace no longer exposes every old screen.

## Cleanup Sequence Recommendation

1. Keep product cleanup separate from capability cleanup.
2. Before deleting a hidden surface, add a migration test proving old history, guide launch, replay, keyboard routing, and OOE diagnostics still land on the intended modern surface.
3. Retire visible wording first, then route vocabulary, then schemas, and only then internal implementation code.
4. Never delete shared math cores just because one workspace stopped exposing them directly.
5. Treat cleanup candidates as named follow-up slices, not incidental edits inside solver/runtime/display milestones.

## Conclusion

The repo contains stale-looking names, but most are compatibility contracts or reusable cores. The immediate safe action is documentation and classification, not deletion. Future cleanup should be proof-driven: remove only after compatibility mappings, history replay, guide launch, and tests show the old path is no longer needed.
