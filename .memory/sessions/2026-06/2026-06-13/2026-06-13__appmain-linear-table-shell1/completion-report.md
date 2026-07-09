# APPMAIN-LINEAR-TABLE-SHELL1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Task Goal

Extract the Linear Algebra and Table shell wiring from AppMain while keeping the existing Matrix, Vector, and Table runtimes unchanged.

## Recovery Note

This memory dossier was added after the implementation commit because the normal memory closeout step was missed when `ff89282` was created. The recovery was recorded by amending the metadata-only memory commit, not by rewriting the original implementation commit.

## What Changed

- Added `src/app/runtime/useLinearAlgebraTableShellRuntime.ts` as a composite shell hook.
- Wrapped the existing `useLinearAlgebraRuntime` and `useTableRuntime` boundaries instead of replacing their runtime engines.
- Moved Matrix/Vector/Table host prop assembly, shell refs, keyboard/focus routing adapters, replay restoration adapters, reset/clear helpers, and action-routing glue out of `src/AppMain.tsx`.
- Added `src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx`.
- Ratcheted `tools/file-size-baseline.json` for the AppMain shrink.

## Boundaries

- Preserved Matrix, Vector, and Table capabilities, history modes, replay payloads, and runtime request behavior.
- No solver behavior, display policy, replay contract, capability ID, worker-host, OOE policy, schema, or global state-management changes.
- No global reducer, event bus, generic runtime framework, or Equation runtime extraction.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:ui -- src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx src/app/runtime/useTableRuntime.ui.test.tsx` passed.
- `npm run test:ui -- src/AppMain.ui.test.tsx` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `node tools/validate-file-sizes.mjs --update-baseline`, then `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Size Ratchet

- `src/AppMain.tsx`: 4,282 -> 4,213 lines.
- `src/app/runtime/useLinearAlgebraTableShellRuntime.ts`: 281 lines.
- `src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx`: 210 lines.

## Commits

- `ff89282` Extract Linear/Table shell hook.

## Follow-Ups

- Defer Equation runtime extraction to a later dedicated milestone.
