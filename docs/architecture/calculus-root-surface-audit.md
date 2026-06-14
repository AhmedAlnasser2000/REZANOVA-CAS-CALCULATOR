# Calculus Root Surface Audit

Status: audit

Purpose: classify the post-merge `src/lib/calculus/` root surface before any further district reorganization. This audit is documentation only; it does not move files, change imports, split `calculus-core.ts`, alter worker paths, change schemas, or modify solver behavior.

## Summary

The guided Calculus implementation now lives under `src/lib/calculus/workspace/`, and the visible app-shell identity is `Calculus`. The remaining root clutter is the shared compute surface plus three intentional root surfaces.

The next safe implementation shape is a small `src/lib/calculus/engine/` district for shared compute internals, while keeping stable root surfaces at the root:

- `calculus-identity.ts`
- `calculus-workbench.ts`
- `calculus-strategy.ts`

The planned engine move should not assume every compute helper has zero external consumers. Several helpers are already imported by Symbolic Engine, Engine, Calculate mode, Algebra capability/readback policy, and app runtime tests.

## Current Root Files

### Stable Root Surfaces

#### `calculus-identity.ts`

Role:

- Canonical `calculus` identity and legacy `advancedCalculus` acceptance.
- `isCalculusMode` and mode canonicalization used by AppMain, app logic routers, app-shell display components, runtime hooks, and history helpers.
- Legacy Calculate-to-Calculus screen mapping.

Observed external consumers:

- AppMain.
- App logic routers and focus/runtime helpers.
- DisplayPanel private components.
- History/display runtime helpers.

Decision: keep at root. This is a stable product-identity seam, not an engine implementation helper.

#### `calculus-workbench.ts`

Role:

- Calculate-era derivative/integral/limit workbench defaults and generated LaTeX helpers.
- Shared by Calculate quickform and the current guided Calculus runtime.

Observed external consumers:

- `useCalculateRuntime`.
- `useCalculusRuntime`.
- `CalculateWorkspace`.
- focused runtime tests.

Decision: keep at root for now. It bridges Calculate's compact quickform calculus controls with the guided Calculus runtime and is not purely engine math.

#### `calculus-strategy.ts`

Role:

- Strategy badge and derivative/integral/limit strategy metadata used at the app shell.

Observed external consumers:

- AppMain.

Decision: keep at root for now. It is a small display/strategy seam and does not currently justify an engine move.

### Engine District Candidates

#### `calculus-core.ts`

Role:

- Shared core derivative, integral, and limit evaluation primitives.
- Current over-cap pressure point: `tools/file-size-baseline.json` tracks it at 952 lines.

Observed external consumers:

- Algebra capability-readiness evidence.
- Internal Calculus workspace/core tests and helpers.

Decision: split into `src/lib/calculus/engine/` in a future implementation milestone. Good split candidates are shared node/scalar helpers, integration evaluation, and limit evaluation.

#### `calculus-eval.ts`

Role:

- Lower-level Calculus evaluation entrypoint used by Engine math execution.

Observed external consumers:

- `src/lib/engine/math-engine/expression-execution.ts`.

Decision: move only with a deliberate direct import update or a small root facade if the next split decides it is a stable shared API.

#### `adaptive-simpson.ts`

Role:

- Numeric integration helper.

Observed external consumers:

- Calculus core/workspace integration internals.

Decision: good internal engine candidate.

#### `antiderivative-rules.ts`

Role:

- Shared antiderivative rule recognition.

Observed external consumers:

- Symbolic Engine integration dispatch and rational integration helpers.

Decision: engine candidate, but the future split must update Symbolic Engine imports deliberately. Do not treat it as zero-churn.

#### `calculus-verification.ts`

Role:

- Antiderivative backcheck and verification status contracts.

Observed external consumers:

- Symbolic Engine integration metadata/rational/types.
- Algebra simplify policy.
- Algebra capability-readiness evidence.

Decision: engine candidate or stable root facade candidate. It is an explicit cross-domain verification seam, so a future split should decide whether direct engine imports are acceptable.

#### `finite-limit-target.ts`

Role:

- Directional finite-limit target parsing and LaTeX helpers.

Observed external consumers:

- Engine math-engine expression preparation.
- Calculate mode standard execution.

Decision: engine candidate or stable root facade candidate. It is shared by Calculate and Engine, so moving it requires intentional import updates and focused Calculate/Engine checks.

#### `limit-heuristics.ts`

Role:

- Limit trend and warning heuristics.

Observed external consumers:

- Calculus core internals and tests.

Decision: good internal engine candidate.

## Existing Organized District

### `workspace/`

Role:

- Guided Calculus workspace navigation, examples, UI metadata, family evaluators, and `runCalculusWorkspaceMode`.

Decision: leave untouched in the next root/engine reorganization. It is already the user-facing guided surface and is not part of the shared compute root cleanup.

## Final Records

### `CALCULUS-ENGINE-GROUPING1`

Moved the shared compute helper files into `src/lib/calculus/engine/` with direct import updates and no root compatibility stubs:

- `calculus-eval.ts` -> `engine/eval.ts`
- `adaptive-simpson.ts` -> `engine/adaptive-simpson.ts`
- `antiderivative-rules.ts` -> `engine/antiderivative-rules.ts`
- `calculus-verification.ts` -> `engine/verification.ts`
- `finite-limit-target.ts` -> `engine/finite-limit-target.ts`
- `limit-heuristics.ts` -> `engine/limit-heuristics.ts`

Matching focused tests moved beside the grouped helpers. External consumers in Symbolic Engine integration, Engine math execution, Calculate mode, Algebra simplify/capability readiness, Calculus workbench, and the guided Calculus workspace now import the engine helpers directly.

The root remains intentionally reserved for `calculus-identity.ts`, `calculus-workbench.ts`, `calculus-strategy.ts`, and the still-pending `calculus-core.ts` split target.

## Recommended Next Milestones

### `CALCULUS-ENGINE-GROUPING1`

Move shared compute helpers into `src/lib/calculus/engine/` and de-stutter filenames where safe:

- `calculus-eval.ts` -> `engine/eval.ts`
- `adaptive-simpson.ts` -> `engine/adaptive-simpson.ts`
- `antiderivative-rules.ts` -> `engine/antiderivative-rules.ts`
- `calculus-verification.ts` -> `engine/verification.ts`
- `finite-limit-target.ts` -> `engine/finite-limit-target.ts`
- `limit-heuristics.ts` -> `engine/limit-heuristics.ts`

The milestone should update direct importers intentionally. It should not keep root stubs unless the implementation gate proves one of these helpers is a public stable seam.

### `CALCULUS-CORE-SPLIT1`

Split `calculus-core.ts` into focused engine modules:

- `engine/shared.ts` for Compute Engine boxing, numeric conversion, shared node/scalar helpers, evaluation result types, and cross-family detail helpers.
- `engine/integration.ts` for indefinite, definite, and numeric definite integral evaluation.
- `engine/limits.ts` for finite/infinite limit evaluation and limit-only helpers.
- Keep a small `engine/core.ts` or root `calculus-core.ts` facade only if needed to preserve stable internal imports during the split.

This should remove the `src/lib/calculus/calculus-core.ts` file-size baseline entry or reduce it below the ratchet.

## High-Risk Contracts

- Current visible identity remains `calculus` / `calculus.evaluate`.
- Legacy `advancedCalculus`, `AdvancedCalcScreen`, `advancedCalcScreen`, and `advancedCalcSeed` remain accepted compatibility contracts.
- `src/lib/calculus/workspace/*` remains the guided workspace district and should not absorb shared engine helpers.
- Calculate quickform calculus behavior and generated workbench LaTeX must not change.
- Symbolic Engine integration must keep antiderivative verification behavior, strategy metadata, and exact LaTeX unchanged.
- Engine math execution must keep Calculus evaluation request/result shapes unchanged.
- Display wording, provenance labels, detail sections, OOE metadata, worker host ids, schemas, and replay behavior must not change.

## Stop Rules

- Stop if a root move requires changing persisted History fields, Guide launch fields, or `AdvancedCalcScreen`.
- Stop if moving a helper changes solver output, warning wording, exact LaTeX, backcheck behavior, or strategy metadata.
- Stop if Symbolic Engine integration, Engine math execution, or Calculate quickform require behavior changes rather than import updates.
- Stop if `workspace/` needs edits for a shared compute reorganization.
- Stop if a root facade would hide ownership rather than preserving a genuinely stable public seam.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/calculus/*.test.ts src/lib/calculus/workspace/*.test.ts`
- `npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/limits.test.ts`
- `npm run test:unit -- src/lib/engine/math-engine/*.test.ts src/lib/modes/calculate/*.test.ts`
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/AppMain.ui.test.tsx src/AppMain.status.ui.test.tsx`
- `npm run lint`
- `npm run build`
- `node tools/validate-file-sizes.mjs --update-baseline` only if the split removes stale baseline entries, then `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
