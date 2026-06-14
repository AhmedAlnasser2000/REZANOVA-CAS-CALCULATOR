# Calculus Identity Surface Audit

Status: audit

Purpose: map the remaining `Calculus` versus legacy `Advanced Calculus` naming surfaces before any rename or cleanup. This audit is documentation only; it does not rename code, move files, alter schemas, change replay behavior, or touch CSS.

## Current Canonical Identity

- Visible workspace: `Calculus`.
- Canonical current mode id: `calculus`.
- Canonical current runtime capability: `calculus.evaluate`.
- Canonical current worker host: `calculus-worker-runtime` with `calculus-runtime` fallback.
- Legacy accepted mode id: `advancedCalculus`.
- Legacy/internal implementation vocabulary: `advancedCalc*`, `AdvancedCalcScreen`, `AdvancedCalculusWorkspace`, `src/lib/advanced-calc/*`, and `advanced-calc` CSS selectors.

The current product contract is that new visible launches and current History entries use `calculus`, while legacy `advancedCalculus` entries remain readable/replayable and map forward.

## Surface Map

### Canonical Live Surfaces

- `src/lib/calculus/calculus-identity.ts` defines `CALCULUS_MODE_ID`, canonicalization, and legacy mode acceptance.
- `src/lib/modes/calculus.ts`, `src/lib/modes/worker-clients/calculus-worker-client.ts`, and `src/lib/modes/worker-entrypoints/calculus.worker.ts` own the current Calculus mode/worker identity.
- `src/app/runtime/useCalculusRuntime.ts` is the AppMain-facing Calculus runtime boundary.
- `src/lib/ooe/bridge-schema/ooe-bridge.ts` includes `calculus.evaluate` and current Calculus OOE capability metadata.
- Launcher and menu surfaces present the visible label as `Calculus`.

### Legacy Replay And Schema Surfaces

- `src/types/calculator/mode-types.ts` and `src/lib/app-state/schemas.ts` still accept `advancedCalculus`.
- History schemas and runtime types retain `advancedCalcScreen` / `advancedCalcSeed` fields for old entries and typed replay seeds.
- `useCalculusRuntime`, `useHistoryDisplayRuntime`, `historyDisplayEntry`, and App flow handlers preserve fallback from legacy `advancedCalc*` fields to canonical `calculus*` fields.
- Guide launches may still accept `advancedCalculus` as a legacy target and normalize to the visible Calculus workspace.
- Keyboard/catalog visibility still includes `advancedCalculus` where legacy mode visibility remains accepted.

These are compatibility contracts, not current product identity. They should not be removed or renamed without a schema/replay migration plan.

### Visible-Code Naming Debt

- `src/app/workspaces/AdvancedCalculusWorkspace.tsx` is the largest visible component name mismatch. It renders the visible Calculus workspace but keeps legacy component, prop, and CSS class vocabulary.
- `src/AppMain.tsx` lazy-loads `AdvancedCalculusWorkspace` and uses `advancedCalc*` runtime outputs for Calculus display and workspace props.
- `src/app/shell/DisplayPanel.tsx` and private display-panel shell components receive `advancedCalc*` route/menu props even though the visible copy says `Calculus`.
- App routing helpers such as focus routing, expression routing, mode reset, mode action handlers, Guide routing, and window key routing use `advancedCalcScreen`, `advancedCalcRouteMeta`, and related names.
- `src/app/runtime/useShellFocusRuntime.ts` and `useCalculusRuntime.ts` expose the same legacy vocabulary in app-shell boundaries.

These are the best candidates for future cleanup because they do not inherently require changing persisted identifiers.

### Internal Implementation Vocabulary

- `src/lib/advanced-calc/*` owns advanced calculus implementation modules for navigation, examples, UI metadata, integrals, limits, ODE, partials, and series.
- Algebra variable-memory mode policy still uses `advanced-calc` for protected-variable policy and readback labels.
- Symbolic, Algebra, and Engine audit docs mention advanced-calculus consumers because current tests and internal engine paths still use that wording.

This layer should stay in place until a dedicated engine/path consolidation milestone. Renaming it casually would create high churn across tests and downstream solver consumers without improving visible product identity.

### CSS And Class Surfaces

- `src/styles/app/advanced-calc.css` and `.advanced-calc-*` selectors remain the CSS home for Calculus panels after the app CSS decomposition.
- The prior style boundary treats `advanced-calc` as internal compatibility naming, not a separate visible workspace.

CSS selector renames should be deferred until a dedicated visual/CSS naming milestone because class names are used by components and UI tests.

### Guide And Content Surfaces

- Guide domains and article selectors still include `advancedCalculus` and advanced-calculus article files.
- Current Guide-facing behavior should continue to present one visible Calculus workspace and avoid reintroducing a separate Advanced Calculus app.
- Any Guide domain cleanup needs its own article-id and selector compatibility audit.

## Classification

- Public stable current identity: `calculus`, `calculus.evaluate`, `calculus-worker-runtime`, visible label `Calculus`.
- Legacy compatibility seam: `advancedCalculus`, `advancedCalcScreen`, `advancedCalcSeed`, and schema/history replay fallback paths.
- Internal transitional names: `advancedCalc*` app/runtime props and helper function names.
- Internal implementation district: `src/lib/advanced-calc/*`.
- CSS compatibility surface: `advanced-calc.css` and `.advanced-calc-*`.
- Ready for retirement now: none. Retirement requires dedicated migration and tests.

## Recommended Next Milestones

1. `CALCULUS-WORKSPACE-NAMING-CLOSURE1`
   - Rename the app-shell component/file/export from `AdvancedCalculusWorkspace` to `CalculusWorkspace`.
   - Keep CSS classes, `AdvancedCalcScreen`, replay fields, and `src/lib/advanced-calc/*` unchanged.
   - Update lazy imports, tests, docs, and file-size baseline only if required.

2. `CALCULUS-APP-SHELL-PROP-NAMING1`
   - Normalize AppMain, DisplayPanel, shell focus, and app logic prop names from `advancedCalc*` to `calculus*` where they are purely current Calculus UI/runtime state.
   - Keep legacy schema fields and replay fallback names unchanged.

3. `CALCULUS-GUIDE-DOMAIN-COMPAT-AUDIT0`
   - Audit `advancedCalculus` Guide domain/content ids before any content or selector rename.
   - Decide whether Guide ids should stay as compatibility aliases or migrate behind explicit redirects.

4. `CALCULUS-ENGINE-PATH-AUDIT0`
   - Audit whether `src/lib/advanced-calc/*` should remain the implementation district or move under a canonical `src/lib/calculus/` subdistrict.
   - Defer any movement until integration, limits, ODE, partial, series, and variable-memory tests are ready to gate the change.

5. `CALCULUS-CSS-IDENTITY-CLOSURE1`
   - Optional future CSS/class rename if the component and app-shell naming have already stabilized.
   - This should not be mixed with TypeScript runtime cleanup.

## High-Risk Contracts

- Legacy `advancedCalculus` History entries must remain loadable and replayable.
- New History entries and OOE runs must continue to emit canonical `calculus` / `calculus.evaluate`.
- `AdvancedCalcScreen` values must remain stable unless every persisted and Guide seed contract migrates together.
- Guide example dispatch must continue to open the visible Calculus workspace.
- Variable-memory protected-name policy for Calculus bound variables must not change.
- CSS selector movement must not change visible layout or break app shell import order.
- Virtual keyboard visibility must continue to work for canonical Calculus and accepted legacy mode contexts.

## Stop Rules

- Stop if a rename requires removing `advancedCalculus` from schemas, runtime types, bridge schemas, or replay fallback paths.
- Stop if a component rename starts touching solver behavior, Calculus worker behavior, OOE policy, Display readback, stored-value substitution, or Guide article semantics.
- Stop if a CSS rename is required to complete a TypeScript naming slice.
- Stop if a cleanup would reintroduce a separate visible `Advanced Calculus` launcher/workspace.

## Test Gates For Future Code Slices

- `npx tsc -b --pretty false`
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/AppMain.ui.test.tsx src/AppMain.status.ui.test.tsx`
- `npm run test:unit -- src/lib/app-state/history-schema.test.ts src/lib/navigation/launcher.test.ts src/lib/guide/content.test.ts`
- `npm run test:unit -- src/lib/advanced-calc/engine.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/limits.test.ts src/lib/advanced-calc/partials.test.ts src/lib/advanced-calc/series.test.ts src/lib/advanced-calc/ode.test.ts src/lib/advanced-calc/navigation.test.ts src/lib/advanced-calc/ui.test.ts`
- `npm run test:unit -- src/lib/calculus/calculus-core.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Final Split Record: CALCULUS-WORKSPACE-NAMING-CLOSURE1

`CALCULUS-WORKSPACE-NAMING-CLOSURE1` renamed the private app-shell workspace component from `AdvancedCalculusWorkspace` to `CalculusWorkspace`.

- Moved `src/app/workspaces/AdvancedCalculusWorkspace.tsx` to `src/app/workspaces/CalculusWorkspace.tsx`.
- Renamed the component export and local props type to `CalculusWorkspace` / `CalculusWorkspaceProps`.
- Updated AppMain's lazy import and JSX usage to the canonical workspace component name.
- Changed workspace-local current editor contexts from legacy `advancedCalculus` to canonical `calculus` where they describe current live Calculus UI behavior.
- Preserved CSS class names/selectors, `AdvancedCalcScreen`, `advancedCalcScreen`, `advancedCalcSeed`, `src/lib/advanced-calc/*`, schemas, Guide ids, replay fallback names, worker ids, and runtime behavior.

## Final Split Record: CALCULUS-APP-SHELL-PROP-NAMING1

`CALCULUS-APP-SHELL-PROP-NAMING1` normalized current app-shell Calculus state and prop names from `advancedCalc*` to `calculus*` where the names describe live UI/runtime state rather than persisted compatibility contracts.

- Renamed AppMain Calculus runtime destructuring, display props, focus/runtime routing dependencies, soft-action/window-key/keypad routing dependencies, and DisplayPanel private component props to canonical `calculus*` names.
- Renamed `useCalculusRuntime` outputs and callbacks such as `calculusScreen`, `calculusRouteMeta`, `calculusWorkbenchExpression`, `openCalculusScreen`, `applyCalculusSeed`, and `runCalculusAction`.
- Renamed current History/Display shell delegates from `currentAdvancedCalcHistoryContext` / `openAdvancedCalcScreen` / `applyAdvancedCalcSeed` to current Calculus-facing names.
- Preserved persisted and content-facing compatibility names: `AdvancedCalcScreen`, `advancedCalcScreen`, `advancedCalcSeed`, `advancedCalculus`, Guide launch fields, schemas, replay fallback fields, and `src/lib/advanced-calc/*`.
- Preserved CSS selector/class names, solver/runtime behavior, OOE capability ids, worker ids, Display wording, Guide behavior, and replay/history compatibility.
