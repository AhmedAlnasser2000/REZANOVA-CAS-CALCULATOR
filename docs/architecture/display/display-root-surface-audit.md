# Display Root Surface Audit

Status: audit with result/scheduling and notation split records.

Purpose: map `src/lib/display` before moving result/render and notation helpers into districts. Display owns committed-result presentation policy: exact/approx formatting, branch-aware readback, result blocks, detail lines, notation preferences, render scheduling, and large-result previews. It does not own solver math, OOE launch/drop policy, history schemas, replay contracts, worker host identity, or app-shell component structure.

## Current Surface

- Stable root public surfaces: `format.ts`, `numeric-output.ts`, `symbolic-display.ts`, `math-notation.ts`, `math-notation-context.ts`, and `symbolic-output-hygiene.ts`.
- Producer-facing root surfaces: `branch-readback.ts` and `result-detail-lines.ts`; these are used by Equation, Trigonometry, Geometry, Algebra, and Display block assembly.
- Private result/render candidates: `display-blocks.ts`, `result-readback.ts`, `result-detail-policy.ts`, `display-render-scheduler.ts`, `result-size-policy.ts`, and `render-profiling.ts`.
- App-shell-adjacent surface: `src/app/shell/DisplayPanel.tsx`; this is component structure and gets a separate audit.

## Responsibility Map

- Notation and formatting: numeric formatting, scalar/matrix/vector Latex helpers, symbolic display normalization, math-notation text conversion, notation React context, and symbolic-output hygiene.
- Result construction and readback: block construction from `DisplayOutcome`, finite branch readback, implicit-product result text expansion, detail-line math/prose tagging, detail-section policy, and periodic/detail block shaping.
- Scheduling and render policy: committed-block reveal order, result-size preview/full-result decisions, and render profiling hooks.
- Display consumers: App shell components, Settings, MathStatic/NotationText, AppMain, Engine, Modes, Equation, Trigonometry, Geometry, Calculus, Statistics, Algebra, Numeric, and Linear Algebra.

## Split Policy

- Keep root facades for broad public APIs: `format`, `numeric-output`, `symbolic-display`, `math-notation`, `math-notation-context`, and `symbolic-output-hygiene`.
- Keep root facades for producer-facing result helpers with real cross-domain fan-out: `branch-readback` and `result-detail-lines`.
- Clean-move private/internal result and scheduling helpers into districts with direct import updates and no root stubs.
- Move tests beside implementation; tests for retained facades should import through the root facade to prove compatibility.
- Do not add `index.ts` barrels.

## High-Risk Contracts

- Exact Latex remains authoritative for copy, To Editor, history, replay, stored output, and solver semantics.
- Display-only compaction, branch rows, preview/full-result behavior, and progressive reveal must not change persisted output.
- Branch metadata must fail closed to existing behavior when ambiguous or malformed.
- OOE remains traffic control for launch/drop/cancel/stale decisions; Display owns how committed results render.
- Notation preferences must not change canonical exact Latex.

## Test Gates

- Root audit: TypeScript, file-size ratchet, memory protocol, and diff whitespace checks.
- Result/scheduling split: Display result/scheduling tests, Equation guarded/shared tests, Modes Equation tests, Trigonometry and Geometry tests, and AppMain UI/status smoke.
- Notation split: Display notation tests, Symbolic Engine, Engine, Calculate/Equation mode tests, AppMain UI/status smoke, lint, build, file-size, memory protocol, and diff whitespace checks.

## Stop Rules

- Stop if a split requires changing solver outputs, exact Latex, branch row policy, Show-full-result behavior, copy/to-editor behavior, history/replay semantics, OOE policy, schemas, capability ids, worker-host behavior, stored-value behavior, or reserved-symbol behavior.
- Stop if a proposed facade removal would force broad cross-domain import churn for stable shared Display APIs.
- Stop if DisplayPanel component structure begins to mix into `src/lib/display` district work.

## Final Split Record: DISPLAY-RESULT-SCHEDULING-DISTRICT-SPLIT1

`DISPLAY-RESULT-SCHEDULING-DISTRICT-SPLIT1` moved result and scheduling internals into focused districts without changing Display policy or output semantics.

- Created `src/lib/display/result/` for branch readback implementation, display block assembly, result readback, detail-line metadata, and detail policy.
- Created `src/lib/display/scheduling/` for render scheduling, result-size preview policy, and render profiling.
- Kept root facades for `branch-readback` and `result-detail-lines` because producers import those as stable Display helper surfaces.
- Updated `DisplayPanel` and `MathStatic` to direct district imports for private helpers.
- Moved matching tests beside implementations while retained-facade tests import through root paths where compatibility matters.

## Final Split Record: DISPLAY-NOTATION-DISTRICT-SPLIT1

`DISPLAY-NOTATION-DISTRICT-SPLIT1` moved notation and formatting implementations into `src/lib/display/notation/` behind stable root facades.

- Moved `format`, `numeric-output`, `symbolic-display`, `math-notation`, `math-notation-context`, and `symbolic-output-hygiene` implementations and direct tests into the notation district.
- Kept all six root files as explicit compatibility facades because their paths are broad shared Display APIs.
- Kept notation tests importing through root facades to prove compatibility.
- Preserved exact Latex fidelity, display-only symbolic normalization, numeric-output settings, notation context behavior, and internal-output hygiene semantics.
