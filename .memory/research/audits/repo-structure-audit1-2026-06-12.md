# REPO-STRUCTURE-AUDIT1: Initial Structure And Density Audit

date: 2026-06-12
primary_agent: codex
primary_agent_model: gpt-5.5
status: complete-read-only

## Scope

This is a read-only audit for the next Calcwiz organization pass. It does not move files, change imports, delete compatibility paths, or alter behavior. It starts from measured density and current ownership boundaries.

## Snapshot

Measured from the current checkout:

- `src/AppMain.tsx`: 7,644 lines.
- `src/app/logic/runtimeControllers.ts`: 815 lines.
- `src/app/runtime/launchWorkspaceRuntimeJob.ts`: 132 lines.
- `src/app/shell/DisplayPanel.tsx`: 1,590 lines.
- `src/lib/equation/`: 66 top-level files, 83 recursive files including the existing `guarded/` and `substitution/` subfolders.
- `src/lib/algebra/`: 56 top-level files.
- `src/lib/modes/`: 40 top-level files.
- `src/lib/ooe/`: 35 top-level files.
- `src/lib/trigonometry/`: 27 top-level files.
- `src/lib/display/`: 25 top-level files.
- `src/lib/geometry/`: 19 top-level files.
- `src/lib/calculus/`: 17 top-level files.
- `src/lib/advanced-calc/`: 17 top-level files.
- `src/lib/statistics/`: 15 top-level files.
- `src/lib/linear-algebra/`: 12 top-level files.

Recursive pressure by district-like folder:

- `src/lib/equation/`: 83 TypeScript files, 23 over 500 lines.
- `src/lib/algebra/`: 56 TypeScript files, 11 over 500 lines.
- `src/app/`: 51 TypeScript/TSX files, 10 over 500 lines.
- `src/app/logic/`: 21 TypeScript files, 5 over 500 lines.
- `src/app/runtime/`: 9 TypeScript/TSX files, 1 over 500 lines.
- `src/app/shell/`: 8 TSX files, 1 over 500 lines.
- `src/lib/display/`: 25 TypeScript files, 1 over 500 lines.
- `src/lib/ooe/`: 35 TypeScript files, 1 over 500 lines.

Largest files observed in the audited areas:

- `src/AppMain.tsx`: 7,644 lines.
- `src/lib/equation/composition-stage.ts`: 3,795 lines.
- `src/lib/equation/equation-inequality.ts`: 2,812 lines.
- `src/lib/equation/equation-complex.ts`: 2,401 lines.
- `src/lib/algebra/abs-core.ts`: 2,011 lines.
- `src/lib/equation/guarded-solve.test.ts`: 1,826 lines.
- `src/app/shell/DisplayPanel.tsx`: 1,590 lines.
- `src/lib/equation/equation-algebraic-isolation.ts`: 1,450 lines.
- `src/lib/equation/equation-parameterized-trig.ts`: 1,377 lines.
- `src/lib/equation/equation-parameterized-exp-log.ts`: 1,260 lines.

## AppMain Findings

`AppMain.tsx` is still the largest practical risk. It no longer owns every view, but it still directly owns many workspace state clusters:

- Calculate input, screen, algebra tray, menu state.
- Calculus workbench and advanced-calculus-compatible screen/state groups.
- Trigonometry screen/menu/request state.
- Geometry screen/menu/request state.
- Statistics screen/menu/source/request state.
- Equation input/screen/target/numeric panel/coefficient/system state.
- History tickets, variable memory, guide state, runtime refs, editor analysis, and shell orchestration.

Existing extractions prove the safe pattern:

- `useSideSurfaceRuntime`
- `useLauncherRuntime`
- `useShellFocusRuntime`
- `useLinearAlgebraRuntime`
- `useTableRuntime`
- `useLabsRuntime`
- `useCalculatorMemoryPersistence`
- `launchWorkspaceRuntimeJob`

Initial assessment: `APPMAIN-SLIM6` should not be a broad reducer migration. It should extract one cohesive state/runtime cluster at a time, preserving AppMain as the orchestration root.

## Equation Folder Findings

`src/lib/equation/` is the most visibly crowded solver district. The root already has two subfolders (`guarded/` and `substitution/`), which means the repo has already accepted the district-folder direction; the remaining problem is that too many mature families still sit at root.

Recursive grouping by filename:

- Parameterized selected-target families: 20 files.
- Guarded/shared/composition/candidate/substitution/support helpers: 14 root files plus existing guarded/substitution subtrees.
- UX/history/navigation/readback helpers: 7 files.
- Target discovery/selection/resolution: 5 files.
- Worker/runtime helpers: 3 files.
- Complex: 2 files.
- Inequality: 2 files.
- Composition core/stage: 3 files, with `composition-stage.ts` as the largest equation file.
- Polynomial/system/carrier helpers: 5 files.
- Numeric interval solve: 2 files.
- Other equation-specific files: 8 files.

Local import pressure confirms the split must be move-only and staged:

- `composition-stage.ts` imports 22 local/project modules and is the largest file. It should not be the first move unless the slice is specifically about splitting composition internals.
- `equation-selected-target-isolation.ts` imports 15 local/project modules and currently acts as the dispatcher across parameterized families.
- `equation-parameterized-composition.ts` imports 13 local/project modules and depends on most other parameterized families.
- `equation-complex.ts` and `equation-inequality.ts` are large but already conceptually isolated single-family entrypoints.

External direct-import pressure is concentrated on a few public seams:

- `guarded-solve` has the most outside direct imports.
- `equation-navigation`, `shared-solve`, `equation-direct-symbolic-worker-client`, and `equation-target` are also visible seams.
- Most individual `equation-parameterized-*` files have low outside direct-import counts; their import pressure is mostly inside Equation. This makes the parameterized family a good first district candidate.

Initial district candidates:

- `equation/target/`
- `equation/parameterized/`
- `equation/complex/`
- `equation/inequality/`
- `equation/numeric/`
- `equation/guarded/` (already partially exists)
- `equation/composition/`
- `equation/polynomial/`
- `equation/readback/`
- `equation/runtime/`
- `equation/history/`
- `equation/shared/`

Initial assessment: `EQUATION-DISTRICT-SPLIT1` should be move-only. The most urgent split is not capability work; it is ownership visibility. If the next pain is Explorer clutter and daily edit navigation, this should happen before another AppMain slimming pass.

Recommended first Equation district slice:

- Move `equation-parameterized-*.ts` and paired tests into `src/lib/equation/parameterized/`.
- Keep behavior unchanged and update imports only.
- Consider leaving a tiny root-level compatibility barrel only if import churn becomes excessive; otherwise prefer direct updated imports so ownership is visible.
- Do not split `composition-stage.ts` in the same slice; it deserves a separate `COMPOSITION-STAGE-SPLIT` style move/refactor gate later.

## Algebra Folder Findings

`src/lib/algebra/` has become a shared-core district with many unrelated core families at one level. Initial grouping by filename:

- Polynomial: 12 files.
- Variables/named variables/stored values: 9 files.
- Transform/simplify/factor surfaces: 8 files.
- Assumptions: 6 files.
- Domain/value-domain: 6 files.
- Abs/radical/rational: 5 files.
- Inequality: 4 files.
- Other: 6 files.

Measured recursive grouping:

- Polynomial: 12 files.
- Variables/named variables/stored values: 9 files.
- Transform/simplify/factor: 8 files.
- Assumptions: 6 files.
- Domain/value-domain: 6 files.
- Inequality: 4 files.
- Abs/radical/rational: 5 files.
- Readback/exact supplements: 2 files.
- Branch/capability readiness miscellany: 4 files.

Initial district candidates:

- `algebra/polynomial/`
- `algebra/variables/`
- `algebra/transform/`
- `algebra/assumptions/`
- `algebra/domain/`
- `algebra/rational/`
- `algebra/radical/`
- `algebra/abs/`
- `algebra/inequality/`
- `algebra/readback/`

Initial assessment: `ALGEBRA-DISTRICT-SPLIT1` should happen after Equation split planning, because Equation imports many algebra cores and will reveal which import seams need compatibility barrels.

## Display Folder Findings

`src/lib/display/` is not as crowded by count, but it now contains distinct responsibilities:

- branch readback
- display blocks
- render scheduler/profiling
- result size policy
- result detail policy/lines
- notation and numeric output formatting
- symbolic display/output hygiene

Initial assessment: Display should not be split before the current branch/scheduler contracts settle. A later move-only split may be useful, but it is not the first pressure point.

## OOE Folder Findings

`src/lib/ooe/` has strong conceptual boundaries but a flat layout:

- pilots by workspace
- runtime coordinator/envelope
- job contract and active registry
- launch tickets
- diagnostics/trace
- host adapter and bridge
- runtime shell contract

Initial assessment: OOE should not be reorganized until the current host/plan consistency and runtime-shell helper work has stayed stable for a bit. The folder is less urgent than AppMain and Equation.

## Compatibility Warning

Do not delete compatibility-looking code during this pass. In particular:

- `advancedCalculus` vocabulary remains legacy read/replay compatibility and internal implementation vocabulary.
- Hidden Trigonometry function/equation/special-angle paths remain compatibility and reusable-core seams.
- Calculate legacy workbench paths may still be reachable through replay/guide compatibility.
- Schema fields should only be retired through a dedicated `COMPAT-RETIREMENT1` slice.

## Recommended Next Slice

There are two valid next slices depending on the pain being optimized:

1. `EQUATION-DISTRICT-SPLIT1` if the current pain is Explorer clutter, solver-family discoverability, and daily editing in Equation.
2. `APPMAIN-SLIM6` if the current pain is orchestration risk in the remaining AppMain state clusters.

Current recommendation: do `EQUATION-DISTRICT-SPLIT1` first, starting with the parameterized selected-target family, because the user-visible concern that triggered this audit was the crowded `src/lib/equation/` and `src/lib/algebra/` views. AppMain remains important, but it already has a file-size ratchet and several extracted runtime hooks; Equation folder visibility is the more immediate maintenance pain.

When returning to AppMain, do `APPMAIN-SLIM6` only after choosing one cohesive state cluster. Good candidates to inspect next:

- Trigonometry state cluster, because Trig now has a focused surface, typed seed, and runtime shell.
- Geometry state cluster, because Geometry now has typed request/history and runtime shell.
- Statistics state cluster, because Statistics already has typed seed and runtime shell.

Do not combine all three unless the helper boundary is obviously identical and fully covered.

## Open Questions For The Rest Of The Audit

- Which AppMain state cluster has the fewest cross-mode dependencies?
- Which Equation imports are public seams versus private intra-folder imports?
- Should tests move beside implementation in the same district, or should some contract tests remain at the district root?
- Which files need compatibility barrels to avoid a massive import churn?
- Should `composition-stage.ts` be split before or after the broader Equation district move?

## Proposed Acceptance Gates For The First Implementation Slice

For `EQUATION-DISTRICT-SPLIT1` parameterized-family move:

- Move files and tests together.
- Preserve all exported names, solver behavior, history, display output, OOE behavior, and worker/runtime behavior.
- Run focused tests for parameterized Equation plus the broad Equation mode test.
- Run `npm run lint`, `npm run build`, and `npm run test:file-sizes`.
- Update imports mechanically and avoid opportunistic refactors.

For `APPMAIN-SLIM6` if chosen instead:

- Extract one workspace state/runtime cluster only.
- Do not introduce a global reducer, app bus, or new runtime-shell behavior.
- Preserve launch tickets, stale gates, keyboard behavior, history replay, and display scheduling.
