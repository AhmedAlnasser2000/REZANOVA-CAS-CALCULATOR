# Display Result/Scheduling District

Status: final split record for `DISPLAY-RESULT-SCHEDULING-DISTRICT-SPLIT1`.

Purpose: group Display result block construction, readback helpers, detail policy, render scheduling, result-size previews, and render profiling into focused private districts while preserving stable producer-facing root paths.

## District Shape

- `src/lib/display/result/`: finite branch readback implementation, display block assembly, result readback, result detail line metadata, and result detail policy.
- `src/lib/display/scheduling/`: block reveal ordering, compact/full result-size policy, and render profiling helpers.
- Root facades kept: `src/lib/display/branch-readback.ts` and `src/lib/display/result-detail-lines.ts`.
- Root files removed by direct import updates: `display-blocks.ts`, `result-readback.ts`, `result-detail-policy.ts`, `display-render-scheduler.ts`, `result-size-policy.ts`, and `render-profiling.ts`.

## Preserved Contracts

- `DisplayOutcome` remains unchanged.
- Exact Latex remains authoritative for copy, To Editor, history, replay, and stored output.
- Branch row extraction and branch metadata normalization keep their fail-closed behavior.
- Detail line math/prose metadata, concise detail policy, block reveal order, compact-preview thresholds, and render profiling gates keep the same behavior.
- OOE still owns launch/drop/cancel/stale decisions; Display still owns committed-result rendering policy.

## Consumers

- App shell: `DisplayPanel` now imports private block/scheduler/size helpers directly.
- `MathStatic` now imports render profiling from the scheduling district.
- Equation, Trigonometry, Geometry, and Algebra producers keep importing branch readback and detail-line helpers through the root facades.

## Test Gates

- Focused result/scheduling unit tests.
- Equation guarded/shared solve tests, Modes Equation tests, Trigonometry and Geometry tests.
- AppMain UI/status smoke tests.
- File-size ratchet, memory protocol, and diff whitespace checks.

## Stop Rules

- Do not change branch row policy, Show-full-result behavior, detail-section wording, copy/to-editor fidelity, history/replay semantics, OOE policy, schemas, solver output, or notation behavior in this district.
