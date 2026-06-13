# GEOMETRY-DISTRICT-SPLIT1 Verification Summary

Date: 2026-06-13
Agent: claude-code
Model: claude-opus-4-8
Status: implemented, NOT committed (per owner instruction; Codex `MODES-*` worker-client reorganization is concurrently in-flight in the same working tree)

## Result

Move-only split of the two `src/lib/geometry/` monoliths into topic subfolders. Zero behavior change; black-box geometry tests unchanged and green.

## What Changed

Gate A — `core.ts` (1,404 -> 417 lines):
- New `src/lib/geometry/resolvers.ts` (184) holds the resolution layer shared by forward and inverse solvers: `ce` ComputeEngine, `ScalarResolution`/`PointResolution`/`CoordinateResolution` types, `resolveScalar`, `resolvePositiveScalar`, `resolvePoint`, `resolveCoordinateValue`, `isUnknownLatex`, `boxedToFiniteNumber`. (Placed at district level, not under solve-missing/, because `runGeometryRequest` forward dispatch in core.ts also uses them — keeps the move behavior-neutral.)
- New `src/lib/geometry/solve-missing/` with the 14 inverse solvers by family: `planar.ts` (square/rectangle/cube/cuboid), `circular.ts` (circle/sphere/cylinder/cone/arcSector), `triangle.ts` (triangleArea/heron), `coordinate.ts` (distance/midpoint/slope), `shared.ts` (`SolveMissingResult` type), `index.ts` (barrel).
- `core.ts` keeps the public/orchestration surface: `requestTitle`, `toOutcome`, `evaluationToOutcome`, `solveMissingToOutcome`, `runGeometryRequest`, `runGeometryCoreDraft`.

Gate B — `parser.ts` (1,781 -> 96 lines):
- New `src/lib/geometry/parser/shared.ts` (248): all small helpers (`normalizeGeometrySource`, `parsePoint`, `parseAssignments`, `isUnknownValue`, `countUnknownValues`, `parseLineForm`, `parseLineConstraint`, `kindFromFunctionName`, `familyHint`, `GeometryParseOptions` type; `splitTopLevel`/`splitAssignment`/`stripOuterParens` kept private).
- New `parser/structured.ts` (705): `parseStructured` verbatim.
- New `parser/shorthand.ts` (771): `parseShorthand` verbatim.
- `parser.ts` keeps public `geometryRequestToScreen`, `parseGeometryDraft`, `geometryDraftStyle`, importing the strategies. The `parser.ts` file + `parser/` directory coexist exactly like the `modes/equation.ts` + `modes/equation/` precedent.

Baseline: removed `core.ts` (1404) and `parser.ts` (1781) entries from `tools/file-size-baseline.json` since every geometry file is now under the 900 default cap.

## Boundaries

- No solver/geometry math change, no `GeometryRequest`/`GeometryEvaluation`/seed/history/OOE/display change, no mode-surface change.
- Did NOT touch any `src/lib/modes/` file (Codex's concurrent worker-client reorganization owns that area).
- One verbatim deviation caught and corrected during the move: `solveDistanceMissing` uses `resolvePositiveScalar` exactly as the original (an interim `resolveScalar`+manual-check version was reverted before verification).

## Verification

- `tsc -b` filtered to `src/lib/geometry`: zero errors. (Project-wide `tsc` shows only pre-existing `src/lib/modes/*` errors from Codex's in-flight worker-client move — not from this change.)
- `npm run test:unit -- src/lib/geometry`: 7 files, 44 tests passed, unmodified — including `core.test.ts` (14 cases exercising the moved solve-missing solvers) and `parser.test.ts` (14 cases exercising both strategies).
- `npx eslint src/lib/geometry`: clean.
- `node tools/validate-file-sizes.mjs`: passes (geometry entries removed).
- Full-suite `tsc -b`, `test:unit`, `test:ui`, `test:gate` deferred until Codex's `modes/` tree compiles again.

## Pending (not done; held for owner / post-Codex)

- Shared memory appends (journal `2026-06-13.md`, `decisions.md`, `current-state.md` posture line) held to avoid clobbering Codex's concurrent edits to the same files.
- Add `GEOMETRY-DISTRICT-SPLIT1` to `.memory/research/roadmaps/repo-structure-reorganization-roadmap.md` milestone list.
- Single `GEOMETRY-DISTRICT-SPLIT1` commit (owner said do not commit).
