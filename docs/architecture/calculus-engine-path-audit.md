# Calculus Engine Path Audit

## Summary

`CALCULUS-ENGINE-PATH-AUDIT0` audits the remaining tension between canonical visible `calculus` identity and internal implementation paths under `src/lib/advanced-calc/*`.

The current recommendation is to keep `src/lib/advanced-calc/*` as an internal guided Calculus workspace district for now. `src/lib/calculus/*` should remain the shared calculus math core, identity, workbench, and lower-level evaluation layer. A future migration may move or rename the `advanced-calc` district, but only under a dedicated implementation milestone with broad mode, worker, Guide, variable-memory, and history/replay gates.

This audit is docs-only. It does not move engine files, rename exported functions, change imports, or alter runtime behavior.

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

### `src/lib/advanced-calc/*`

Current role: internal guided Calculus workspace district.

- `navigation.ts`
  - Guided Calculus screen tree, route metadata, soft actions, menu movement, and Guide article links.
- `examples.ts`
  - Guided Calculus seed defaults and generated request LaTeX builders for integrals, limits, series, partial derivatives, and ODE.
- `engine.ts`
  - Guided Calculus request orchestration and `runAdvancedCalcMode`.
  - Currently wrapped by `src/lib/modes/calculus.ts` as canonical `runCalculusMode`.
- `integrals.ts`, `limits.ts`, `partials.ts`, `series.ts`, `ode.ts`
  - Guided workspace family evaluators.
- `ui.ts`
  - Guided Calculus provenance badge mapping.

The `advanced-calc` name is now internal implementation vocabulary. It is no longer a separate visible workspace identity.

## Current Consumers

- `src/lib/modes/calculus.ts`
  - Reexports `RunAdvancedCalcModeRequest` as `RunCalculusModeRequest`.
  - Reexports `runAdvancedCalcMode` as canonical `runCalculusMode`.
  - Owns current OOE pilot wrapper calls for `calculus.evaluate`.
- `src/lib/modes/worker-entrypoints/calculus.worker.ts`
  - Calls `runAdvancedCalcMode` inside the current Calculus worker entrypoint.
- `src/lib/modes/worker-clients/calculus-worker-client.ts`
  - Uses `RunAdvancedCalcModeRequest` as the worker request shape.
- `src/app/runtime/useCalculusRuntime.ts`
  - Builds current Calculus runtime state and uses `advanced-calc` navigation/example helpers as the guided workspace model.
- `src/AppMain.tsx` and app logic helpers
  - Use `AdvancedCalcScreen` and `advanced-calc` navigation/UI helpers where the underlying screen tree remains the legacy typed screen contract.
- `src/lib/guide/content/selectors.ts`, `src/lib/guide/domains.ts`, and Guide tests
  - Keep `advancedCalcScreen` / `advancedCalcSeed` launch fields and `advanced-*` article ids as compatibility surfaces.
- `src/lib/algebra/variable-memory/*`
  - Uses internal mode/action policy names such as `advanced-calc` and `advanced-calc-evaluate` to protect active bound variables.
- `src/lib/virtual-keyboard/*`
  - Keeps both current `calculus` and legacy `advancedCalculus` visibility where catalog compatibility is still accepted.
- `src/lib/app-state/schemas.ts`, runtime types, and history schema tests
  - Keep legacy `advancedCalculus`, `advancedCalcScreen`, and `advancedCalcSeed` read/replay compatibility.

## Migration Options

### Option A: Keep `advanced-calc` As Internal District

Recommended current default.

Pros:

- Minimizes churn after visible app-shell naming closure.
- Preserves a useful distinction between shared calculus math cores and guided workspace orchestration.
- Avoids touching worker clients, worker entrypoints, Guide launch fields, variable-memory policy, and schemas prematurely.
- Keeps current test fixtures and provenance names stable.

Cons:

- The folder name remains visibly legacy for contributors browsing the tree.
- Some internal function/type names still read as `AdvancedCalc*`.

### Option B: Move Guided Workspace District Under `src/lib/calculus/workspace/`

Future candidate, not current work.

Potential shape:

- `src/lib/calculus/workspace/navigation.ts`
- `src/lib/calculus/workspace/examples.ts`
- `src/lib/calculus/workspace/engine.ts`
- `src/lib/calculus/workspace/integrals.ts`
- `src/lib/calculus/workspace/limits.ts`
- `src/lib/calculus/workspace/partials.ts`
- `src/lib/calculus/workspace/series.ts`
- `src/lib/calculus/workspace/ode.ts`
- `src/lib/calculus/workspace/ui.ts`

This should be a move-heavy structure commit with direct import updates or compatibility facades chosen deliberately. It must not be mixed with solver behavior or schema migration.

### Option C: Fully Rename Types And Persisted Fields

Not recommended without a schema migration milestone.

This would require changing `AdvancedCalcScreen`, `advancedCalcScreen`, `advancedCalcSeed`, Guide launch fields, history schemas, replay compatibility tests, and likely virtual keyboard compatibility visibility. It is a broader persisted-contract migration, not a path cleanup.

## Recommended Future Sequence

1. Keep `src/lib/advanced-calc/*` in place while current app-shell naming stabilizes.
2. If root/tree clarity remains painful, plan `CALCULUS-GUIDED-WORKSPACE-DISTRICT-MOVE1`.
3. In that move, preserve `AdvancedCalcScreen` and persisted `advancedCalc*` fields unless a separate schema migration has been approved.
4. Gate the move with:
   - advanced-calc family tests
   - calculus mode/worker tests
   - Guide content tests
   - history schema/replay tests
   - variable-memory policy tests
   - AppMain Calculus replay UI tests
5. Defer any persisted naming migration until after the path move proves behavior is stable.

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
- `npm run test:unit -- src/lib/advanced-calc/navigation.test.ts src/lib/advanced-calc/ui.test.ts src/lib/advanced-calc/engine.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/limits.test.ts src/lib/advanced-calc/partials.test.ts src/lib/advanced-calc/series.test.ts src/lib/advanced-calc/ode.test.ts`
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
