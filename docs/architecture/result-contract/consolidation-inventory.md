# Consolidation inventory (2026-10-06)

Read-only baseline: main at ac73a137; user approved a CRITICAL root-only replacement
program. This inventory distinguishes active boundaries from historical route counts.
The 57 frozen route IDs are historical coverage, not 57 currently V1-only producers.

## Producer and evidence ownership

| Lane | Current boundary | Native evidence and migration obligation |
| --- | --- | --- |
| Calculate ordinary/transforms | `src/lib/modes/calculate/{standard,transforms,result-document,math-values}.ts` | Owned Compute Engine/symbolic answer trees exist, but the assembler permits `unproven(canonicalLatex)` and missing detail leaves. Migrate each primary, supplement and detail from native output. |
| Calculate inline linear algebra | `src/lib/modes/calculate/inline-linear-algebra.ts` | V2 structured arithmetic proof; preserve operand/value actions. |
| Matrix/Vector | `src/lib/modes/{matrix,vector}-result-document.ts` | V2 exact native scalar/matrix/vector projection; V3 typed angle. Preserve map profiles, row operations, conditions, selectors and separate runtimes. |
| Statistics | `src/lib/statistics/result-document.ts` | V2 owned leaves for five routes; preserve answer rows and visualization payload ownership. |
| Old Equation | `src/lib/equation/solve-result/{producer,producer-v2,runtime-producer-v2,finite-root-producer,math-values}.ts` | Mixed V1/V2 finalizers; preserve finite-root identity, periodic/system readback, numeric trust and condition evidence. No displayed-root parsing. |
| Old Calculus | `src/lib/calculus/workspace/{result-document,integration-result-document,math-values}.ts` | V1 routes alongside V2 integration and V4 special functions. Native antiderivative expressions already exist; remaining derivative/limit/series/ODE leaves must come from their owning solvers. |
| Geometry | `src/lib/geometry/{result-document,math-values}.ts` | V1; owned leaves coexist with explicit LaTeX-only fallback for primary/branches. Each fallback must be replaced by native evidence. |
| Trigonometry | `src/lib/trigonometry/{result-document,math-values,runtime-run}.ts` | Mixed V1/V2, including typed period/phase. Preserve typed requests, units and branch families. |
| Table | `src/lib/modes/{table-result-document,table-math-values}.ts` | Mixed V1/V2; preserve exact x/cells, undefined reasons and request domain. |
| New Equation | `src/lib/new-equation/`, Equation-owned core result adapter | V6 typed sets and V2 controlled errors. Preserve independent replay, assumptions, isolation and all six outcomes. |
| New Integration | `src/lib/calculus/new-integration/{result,error,service}.ts` | Verified rational decisions projected to V2/V5; source exclusions and independent derivative proof retained. |
| Graphing analysis | registered `graphing.analysis` adapter/consumer boundary | Preserve existing owned structured math and independent Graphing runtime; not an Integration adapter. |

Complete current route ownership and canonical mathematical leaf locations are recorded
in `src/lib/result-contract/mathjson-route-registry.ts`; exemptions are empty. It includes
ordinary values, every request component, compound inputs, special-function leaves,
branch/system/periodic members, supplements, row-operation factors, exact summaries,
resolved inputs/substitutions and table cells. Current traversal adds all root-log data,
Equation binding/assumption leaves, exponential construction and provenance restrictions.

## Frozen source inventory to retire route by route

These are actual baseline paths, not permission to keep a fallback indefinitely.

- `src/lib/modes/calculate/result-document.ts`: `calculate.arithmetic`, `calculate.exact-forms`, `calculate.trigonometry`, `calculate.inverse-trigonometry`, `calculate.transforms`, `calculate.ans`, `calculate.numeric-format`, `calculate.derivatives`, `calculate.integrals`, `calculate.limits`
- `src/lib/modes/calculate/math-values.ts`: `calculate.arithmetic`, `calculate.exact-forms`, `calculate.trigonometry`, `calculate.inverse-trigonometry`, `calculate.transforms`, `calculate.ans`, `calculate.numeric-format`, `calculate.derivatives`, `calculate.integrals`, `calculate.limits`
- `src/lib/modes/calculate/standard.ts`: `calculate.arithmetic`, `calculate.exact-forms`, `calculate.trigonometry`, `calculate.inverse-trigonometry`, `calculate.ans`, `calculate.numeric-format`, `calculate.derivatives`, `calculate.integrals`, `calculate.limits`
- `src/lib/modes/calculate/transforms.ts`: `calculate.transforms`
- `src/lib/calculus/workspace/result-document.ts`: `calculus.derivatives`, `calculus.integrals`, `calculus.limits`, `calculus.series-transforms`, `calculus.partials`, `calculus.ode-ivp`
- `src/lib/calculus/workspace/math-values.ts`: `calculus.derivatives`, `calculus.integrals`, `calculus.limits`, `calculus.series-transforms`, `calculus.partials`, `calculus.ode-ivp`
- `src/lib/equation/guarded/direct-symbolic.ts`: `equation.linear`, `equation.polynomial`, `equation.rational-radical`, `equation.absolute-value`, `equation.trig-exp-log`, `equation.domain-boundary`, `equation.answer-mode`, `equation.numeric-boundary`
- `src/lib/equation/solve-result/finite-root-producer.ts`: `equation.linear`, `equation.polynomial`
- `src/lib/equation/solve-result/math-values.ts`: `equation.linear`, `equation.polynomial`, `equation.rational-radical`, `equation.absolute-value`, `equation.trig-exp-log`, `equation.domain-boundary`, `equation.answer-mode`, `equation.numeric-boundary`
- `src/lib/equation/solve-result/producer.ts`: `equation.linear`, `equation.polynomial`, `equation.rational-radical`, `equation.absolute-value`, `equation.trig-exp-log`, `equation.domain-boundary`, `equation.answer-mode`, `equation.numeric-boundary`
- `src/lib/equation/solve-result/producer-adapter.ts`: `equation.linear`, `equation.polynomial`, `equation.rational-radical`, `equation.absolute-value`, `equation.trig-exp-log`, `equation.domain-boundary`, `equation.answer-mode`, `equation.numeric-boundary`
- `src/lib/equation/solve-result/producer-v2.ts`: `equation.linear`, `equation.polynomial`, `equation.rational-radical`, `equation.absolute-value`, `equation.trig-exp-log`, `equation.domain-boundary`, `equation.answer-mode`, `equation.numeric-boundary`
- `src/lib/modes/equation/run.ts`: `equation.linear`, `equation.polynomial`, `equation.rational-radical`, `equation.absolute-value`, `equation.trig-exp-log`, `equation.domain-boundary`, `equation.answer-mode`, `equation.numeric-boundary`
- `src/lib/geometry/result-document.ts`: `geometry.shape-2d`, `geometry.coordinate-distance`, `geometry.circle`, `geometry.triangle`, `geometry.line-equation`
- `src/lib/geometry/math-values.ts`: `geometry.shape-2d`, `geometry.coordinate-distance`, `geometry.circle`, `geometry.triangle`, `geometry.line-equation`
- `src/lib/trigonometry/result-document.ts`: `trigonometry.function`, `trigonometry.identity`, `trigonometry.equation`, `trigonometry.right-triangle`, `trigonometry.angle-conversion`, `trigonometry.period-phase`
- `src/lib/trigonometry/math-values.ts`: `trigonometry.function`, `trigonometry.identity`, `trigonometry.equation`, `trigonometry.right-triangle`, `trigonometry.angle-conversion`, `trigonometry.period-phase`
- `src/lib/trigonometry/core.ts`: `trigonometry.equation`
- `src/lib/modes/table-result-document.ts`: `table.single-function`, `table.two-functions`, `table.domain-boundary`, `table.rational-function`, `table.trigonometric-function`
- `src/lib/modes/table-math-values.ts`: `table.single-function`, `table.two-functions`, `table.domain-boundary`, `table.rational-function`, `table.trigonometric-function`

## Consumers, actions and persistence

- Contract boundary: `native-result.ts`, `validation-router.ts`, `normalized-result.ts`,
  `consumer.ts`, `runtime-outcome.ts`, `runtime-outcome-versioned.ts` and shared calculator
  runtime/display types. These currently branch on versions and must dispatch on kinds.
- Printers: `src/lib/display/printer/`, `integration-presentation.ts`, Equation-owned
  presentation/readback. Preserve the printers; no reparsing displayed LaTeX for authority.
- Actions: `src/app/logic/{displayClipboard,clipboardPipeline}.ts`, runtime action validation,
  To Editor, answer reuse/Ans, variables and History replay. Consumer support must be
  explicit for typed formal primitives and negative decisions.
- History: `src/lib/app-state/{schemas,tauri}.ts`, `src/app/runtime/{historyPersistence,
  useHistoryDisplayRuntime,useAppPersistenceRuntime}.ts`, `src/lib/history-replay/` and
  `src-tauri/src/lib.rs`. Browser and Tauri paths must agree. The existing browser helper
  treats result versions above 4 as opaque future records; replace that policy for current
  storage. Do not preserve invalid old results as opaque rows after retirement.
- Existing V1 History size fallback strips optional MathJSON. Delete it; current leaves
  are mandatory and oversized canonical results cannot silently lose mathematical data.
- App persistence restores History, variable memory and ansLatex together; deletion must
  invalidate dependent answer state, not reset unrelated settings/documents/drafts.
- New Integration saved problems currently use envelope 1 with rational decision 1.
  New adoption envelope is independent from wire revision 7. Imported files remain untouched.
- Notebook, clipboard and workspace document versions are separate schema families. Inspect
  their embedded result boundaries; do not mechanically rename every numeric version to 7.
- Worker/OOE result replies must be authority-checked before state commits. Host identities,
  request revisions, cancellation, stale checks and per-workspace capabilities stay separate.

## Existing registered consumer files

The following is a path snapshot of the enforced display consumer registry. Migration
must preserve lane ownership and zero legacy-read/compatibility-projection floors.

- `src/AppMain.tsx`
- `src/app/logic/displayClipboard.ts`
- `src/app/logic/equationNumericIntervalRuntime.ts`
- `src/app/runtime/equation-explicit-numeric-panels.ts`
- `src/app/runtime/historyDisplayEntry.ts`
- `src/app/runtime/useEquationRuntime.ts`
- `src/app/runtime/useHistoryDisplayRuntime.ts`
- `src/app/runtime/workspace-display-state.ts`
- `src/app/shell/display-panel/DisplayOutcomeShell.tsx`
- `src/lib/__golden__/print-hygiene-baseline.ts`
- `src/lib/calculus/new-integration/error.ts`
- `src/lib/calculus/new-integration/result.ts`
- `src/lib/calculus/workspace/engine.ts`
- `src/lib/display/notation/symbolic-output-hygiene.ts`
- `src/lib/display/print-hygiene.ts`
- `src/lib/display/result/display-read-model.ts`
- `src/lib/equation/guarded/algebra-stage.ts`
- `src/lib/equation/guarded/merge.ts`
- `src/lib/equation/guarded/request-prep.ts`
- `src/lib/equation/solve-result/producer-adapter.ts`
- `src/lib/equation/solve-result/runtime-finite-root-producer.ts`
- `src/lib/equation/solve-result/stage-carrier.ts`
- `src/lib/equation/target/surface.ts`
- `src/lib/history-replay/fixture-contract.ts`
- `src/lib/modes/calculate/runtime.ts`
- `src/lib/modes/equation/outcomes.ts`
- `src/lib/new-equation/error.ts`
- `src/lib/ooe/diagnostics/diagnostics-buffer.ts`
- `src/lib/result-contract/consumer.ts`
- `src/lib/result-contract/integration-presentation.ts`
- `src/lib/result-contract/mathjson-coverage.ts`
- `src/lib/result-contract/native-result.ts`
- `src/lib/result-contract/runtime-outcome.ts`
- `src/lib/surface-protocol/dto.ts`
- `src/lib/symbolic-engine/equation/service/service.ts`
- `src/lib/trigonometry/core.ts`

## Deletion candidates and unresolved evidence

V1–V6 builders, validators, selectors, wrappers and historical-only tests are scheduled
for deletion after callers migrate; their current presence is not proof of dead code.
No solver/printer/codec is declared unused merely because its filename contains a version.
A route-local missing tree is an explicit migration obligation, not a schema relaxation.
Final retirement requires live-reference scans and capability tests in addition to this
inventory. No completed producer migration, storage reset or UI adoption is claimed by this original baseline.

## Focused implementation update — 2026-10-06

The user deferred unfinished old Equation/Calculus/Geometry/Trigonometry/Table migrations
and global retirement. New Equation, rational New Integration and Graphing analysis now
emit current schema 7. Previously verified Calculate/Matrix/Vector/Statistics/indefinite
Calculus migrations remain. Shared typed consumers/actions and scoped persistence
cleanup/notification have passing focused and real-app evidence. Notebook has no result
producer to migrate here. Sixteen frozen deferred sources remain unchanged and enforced.

Current consumer handling explicitly rejects unsupported bound/typed answer reuse.
History accepts schema 7; cleanup removes incompatible records, invalidates dependent
Ans and preserves compatible deferred records and independent drafts/settings/documents.
No historical converter or recomputation migration exists. Complete exponential
projection/adoption and unfinished legacy retirement are not claimed by this update.
