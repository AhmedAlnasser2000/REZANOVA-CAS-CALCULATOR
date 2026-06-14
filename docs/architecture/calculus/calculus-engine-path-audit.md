# Calculus Engine Path Audit

## Summary

`CALCULUS-ENGINE-PATH-AUDIT0` audited the former tension between canonical visible `calculus` identity and the old internal implementation path under `src/lib/advanced-calc/*`.

`CALCULUS-GUIDED-WORKSPACE-MERGE1` retired the physical `src/lib/advanced-calc/*` folder and moved the guided workspace implementation under `src/lib/calculus/workspace/*`. `src/lib/calculus/*` remains the shared calculus math core, identity, workbench, and lower-level evaluation layer.

The original audit was docs-only. The final merge record below documents the later path move and export-name cleanup without solver, schema, replay, OOE, worker-host, or display behavior changes.

## Current Path Map

### `src/lib/calculus/*`

Current role: shared Calculus math core and canonical identity support.

- `calculus-identity.ts`
  - Canonical `calculus` identity.
  - Legacy `advancedCalculus` acceptance and canonicalization.
  - Legacy Calculate calculus-screen mapping into current Calculus screens.
- `calculus-workbench.ts`
  - Calculate-era derivative/integral/limit workbench defaults and generated LaTeX helpers.
  - Still used by Calculate and the current Calculus runtime for derivative preview construction.
- `calculus-core.ts`, `calculus-eval.ts`, `calculus-verification.ts`
  - Shared derivative/integral/limit evaluation primitives and verification policy.
  - Consumed by Calculus mode and downstream symbolic/engine tests.
- `adaptive-simpson.ts`, `antiderivative-rules.ts`, `finite-limit-target.ts`, `limit-heuristics.ts`, `calculus-strategy.ts`
  - Shared numerical and symbolic support helpers.
  - These are not app-shell workspace files.

### `src/lib/calculus/workspace/*`

Current role: internal guided Calculus workspace district.

- `navigation.ts`
  - Guided Calculus screen tree, route metadata, soft actions, menu movement, and Guide article links.
- `examples.ts`
  - Guided Calculus seed defaults and generated request LaTeX builders for integrals, limits, series, partial derivatives, and ODE.
- `engine.ts`
  - Guided Calculus request orchestration and `runCalculusWorkspaceMode`.
  - Currently wrapped by `src/lib/modes/calculus.ts` as canonical `runCalculusMode`.
- `integrals.ts`, `limits.ts`, `partials.ts`, `series.ts`, `ode.ts`
  - Guided workspace family evaluators.
- `ui.ts`
  - Guided Calculus provenance badge mapping.

The guided workspace now lives under the canonical Calculus tree. Legacy `advancedCalc*` persisted fields, `AdvancedCalcScreen`, and `advancedCalculus` replay mode acceptance remain compatibility contracts rather than current product identity.

## Current Consumers

- `src/lib/modes/calculus.ts`
  - Reexports `RunCalculusWorkspaceModeRequest` as `RunCalculusModeRequest`.
  - Reexports `runCalculusWorkspaceMode` as canonical `runCalculusMode`.
  - Owns current OOE pilot wrapper calls for `calculus.evaluate`.
- `src/lib/modes/worker-entrypoints/calculus.worker.ts`
  - Calls `runCalculusWorkspaceMode` inside the current Calculus worker entrypoint.
- `src/lib/modes/worker-clients/calculus-worker-client.ts`
  - Uses `RunCalculusWorkspaceModeRequest` as the worker request shape.
- `src/app/runtime/useCalculusRuntime.ts`
  - Builds current Calculus runtime state and uses `calculus/workspace` navigation/example helpers as the guided workspace model.
- `src/AppMain.tsx` and app logic helpers
  - Use `AdvancedCalcScreen` and Calculus workspace navigation/UI helpers where the underlying screen tree remains the legacy typed screen contract.
- `src/lib/guide/content/selectors.ts`, `src/lib/guide/domains.ts`, and Guide tests
  - Keep `advancedCalcScreen` / `advancedCalcSeed` launch fields and `advanced-*` article ids as compatibility surfaces.
- `src/lib/algebra/variable-memory/*`
  - Uses internal mode/action policy names such as `advanced-calc` and `advanced-calc-evaluate` to protect active bound variables.
- `src/lib/virtual-keyboard/*`
  - Keeps both current `calculus` and legacy `advancedCalculus` visibility where catalog compatibility is still accepted.
- `src/lib/app-state/schemas.ts`, runtime types, and history schema tests
  - Keep legacy `advancedCalculus`, `advancedCalcScreen`, and `advancedCalcSeed` read/replay compatibility.

## Migration Options

### Completed Option: Move Guided Workspace District Under `src/lib/calculus/workspace/`

Completed by `CALCULUS-GUIDED-WORKSPACE-MERGE1`.

Current shape:

- `src/lib/calculus/workspace/navigation.ts`
- `src/lib/calculus/workspace/examples.ts`
- `src/lib/calculus/workspace/engine.ts`
- `src/lib/calculus/workspace/integrals.ts`
- `src/lib/calculus/workspace/limits.ts`
- `src/lib/calculus/workspace/partials.ts`
- `src/lib/calculus/workspace/series.ts`
- `src/lib/calculus/workspace/ode.ts`
- `src/lib/calculus/workspace/ui.ts`

The move used direct import updates and no root compatibility stubs because this is an internal implementation district, not a stable public facade.

### Option C: Fully Rename Types And Persisted Fields

Not recommended without a schema migration milestone.

This would require changing `AdvancedCalcScreen`, `advancedCalcScreen`, `advancedCalcSeed`, Guide launch fields, history schemas, replay compatibility tests, and likely virtual keyboard compatibility visibility. It is a broader persisted-contract migration, not a path cleanup.

## Recommended Future Sequence

1. Complete `CALCULUS-CSS-IDENTITY-CLOSURE1` to rename the app CSS file and live Calculus selectors.
2. Keep `AdvancedCalcScreen`, `advancedCalcScreen`, `advancedCalcSeed`, and `advancedCalculus` as compatibility names unless a separate schema migration has been approved.
3. Defer any persisted naming migration until after the path and CSS identity cleanup prove behavior is stable.

## High-Risk Contracts

- `calculus` and `calculus.evaluate` remain canonical current runtime identity.
- Legacy `advancedCalculus` entries remain readable and replayable.
- `AdvancedCalcScreen` values remain stable for history, Guide launch, and workspace screen routing.
- `advancedCalcScreen` and `advancedCalcSeed` remain accepted persisted/Guide fields.
- Worker request shapes and host ids remain unchanged.
- Variable-memory policy must continue protecting active Calculus bound variables.
- Guide article ids and launch examples must remain stable.
- Calculus output wording, provenance badges, exact LaTeX, warnings, and detail sections must not change during path cleanup.

## Test Gates For Any Future Move

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/calculus/workspace/navigation.test.ts src/lib/calculus/workspace/ui.test.ts src/lib/calculus/workspace/engine.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/workspace/limits.test.ts src/lib/calculus/workspace/partials.test.ts src/lib/calculus/workspace/series.test.ts src/lib/calculus/workspace/ode.test.ts`
- `npm run test:unit -- src/lib/calculus/calculus-core.test.ts src/lib/calculus/calculus-workbench.test.ts src/lib/calculus/calculus-strategy.test.ts`
- `npm run test:unit -- src/lib/modes/calculus-worker-runtime.test.ts src/lib/app-state/history-schema.test.ts src/lib/guide/content.test.ts`
- `npm run test:unit -- src/lib/algebra/variable-memory/*.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/AppMain.ui.test.tsx src/AppMain.status.ui.test.tsx`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Stop if a path move requires changing HistoryEntry schema fields or Guide launch field names.
- Stop if a move changes `calculus.evaluate`, worker host ids, fallback ids, or OOE provenance.
- Stop if shared `src/lib/calculus/*` math cores start absorbing app-shell workspace state.
- Stop if variable-memory protected-variable policy changes wording or behavior.
- Stop if output wording, exact LaTeX, warnings, provenance badges, or Display detail sections change.
- Stop if the change reintroduces a visible `Advanced Calculus` workspace.

## Final Merge Record: CALCULUS-GUIDED-WORKSPACE-MERGE1

`CALCULUS-GUIDED-WORKSPACE-MERGE1` retired the physical `src/lib/advanced-calc/` implementation folder.

- Moved guided workspace implementation and tests into `src/lib/calculus/workspace/`.
- Renamed live implementation exports from `runAdvancedCalcMode` / `RunAdvancedCalcModeRequest` and `getAdvancedCalc*` helpers to canonical `runCalculusWorkspaceMode` / `RunCalculusWorkspaceModeRequest` and `getCalculus*` helpers.
- Updated AppMain, app runtime hooks, app logic, modes, worker client/entrypoint, and tests to import directly from the new Calculus workspace district.
- Kept `AdvancedCalcScreen`, `AdvancedCalcResultOrigin`, `advancedCalcScreen`, `advancedCalcSeed`, legacy `advancedCalculus`, Guide launch fields, and Guide content ids as compatibility contracts.
- Preserved solver behavior, output wording, Display policy, OOE policy, worker-host identity, schema shape, replay/history behavior, stored-value behavior, Guide behavior, and reserved-symbol behavior.
