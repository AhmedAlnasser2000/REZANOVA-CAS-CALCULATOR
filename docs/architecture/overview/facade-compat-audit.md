# Facade Compatibility Audit

Status: audit

Purpose: classify the repo-wide public/root surfaces that remain after the Equation, Algebra, Modes, Symbolic Engine, Engine, OOE, App runtime, and CSS decomposition work. This audit is a map only: it does not move, delete, or rename facades.

## Classification Rules

- Public stable surface: callers should continue importing here unless a future migration explicitly changes the public API.
- Compatibility shim: a root file exists mainly to preserve older imports while implementation lives in a district.
- Internal transitional facade: an app-facing helper exists to hold an orchestration boundary while further ownership is still settling.
- Active root surface: the root file still owns meaningful logic and should not be flattened into a district without its own milestone.
- Ready for retirement: no current surface is classified this way in this audit; retirement requires a dedicated migration commit and import search.

## Algebra

Public stable surfaces:

- Root Algebra imports remain stable for product and solver layers. `algebra-transform.ts`, `algebra-transform-ui.ts`, `assumptions-core.ts`, `assumption-adapters.ts`, `assumption-readback.ts`, `branch-core.ts`, `capability-readiness.ts`, `domain-sampling-readiness.ts`, `exact-supplements.ts`, `named-variable.ts`, `polynomial-domain-core.ts`, `polynomial-roots.ts`, `simplify-policy.ts`, `value-domain-core.ts`, `variable-hints.ts`, `variable-memory-store.ts`, and `symbolic-factor.ts` are allowed root imports.

Compatibility shims:

- `abs-core.ts`, `domain-range-core.ts`, `inequality-core.ts`, `inequality-sign-analysis-core.ts`, `polynomial-bivariate-elimination.ts`, `polynomial-core.ts`, `polynomial-elimination-core.ts`, `polynomial-factor-solve.ts`, `radical-core.ts`, `rational-function-core.ts`, `transform-core.ts`, `variable-core.ts`, and `variable-memory.ts`.
- Known callers: Equation guarded/shared solve, Symbolic Engine, Engine, Modes Calculate/Equation/Table, Calculus, Advanced Calc, and Algebra tests.
- Intended future role: keep these root files as compatibility facades while private district modules evolve behind them.
- Retirement condition: only after all first-party and any documented public imports migrate through a planned root-surface migration. No such migration is approved now.

Active root surfaces:

- Branch/assumption/readback, domain sampling, polynomial roots/domain, variable hints, named variables, capability readiness, and exact supplement helpers remain active root surfaces because their wording/source-label contracts are small but broadly consumed.

## Equation

Public stable surfaces:

- Root Equation imports are the public boundary for mode/runtime/app callers. Product code should prefer root Equation files over private district paths unless it is inside the same district.

Compatibility shims:

- `candidate-rejection.ts`, `candidate-validation.ts`, `composition-core.ts`, `composition-stage.ts`, `equation-algebraic-isolation.ts`, `equation-complex.ts`, `equation-direct-symbolic-worker-client.ts`, `equation-direct-symbolic.worker.ts`, `equation-polynomial-domain.ts`, `equation-polynomial-system.ts`, `equation-selected-target-isolation.ts`, `equation-target.ts`, `equation-target-resolution.ts`, `guarded-solve.ts`, `numeric-interval-solve.ts`, `polynomial-carrier-follow-on.ts`, and `substitution-solve.ts`.
- Known callers: Modes Equation, App runtime Equation hook, guarded stages, direct-symbolic worker surfaces, history/replay, and Equation tests.
- Intended future role: keep root shims so external import paths remain stable while private districts own implementation.

Active root surfaces:

- `complex-input-policy.ts`, `domain-guards.ts`, `equation-branch-readback.ts`, `equation-history.ts`, `equation-inequality.ts`, `equation-navigation.ts`, `equation-ux.ts`, `range-impossibility.ts`, and `shared-solve.ts`.
- Retirement condition: none are ready for retirement; each needs an explicit audit/split or root-surface milestone before movement.

## Modes

Public stable surfaces:

- Mode callers should keep importing root mode facades such as `calculate.ts`, `equation.ts`, `table.ts`, `matrix.ts`, `vector.ts`, `calculus.ts`, `geometry.ts`, `statistics.ts`, `trigonometry.ts`, `table-core.ts`, `calculate-navigation.ts`, `equation-ui-model.ts`, and `core-mode.ts`.

Compatibility shims:

- `calculate.ts` and `equation.ts` are district-backed public facades over private mode orchestration modules.

Active root surfaces:

- `table.ts`, `table-core.ts`, `matrix.ts`, `vector.ts`, thin mode facades, navigation/UI-model seams, worker runtime tests, and mode worker grouping folders remain active Mode surfaces.
- Worker clients and worker entrypoints now live in `worker-clients/` and `worker-entrypoints/`; they are direct public/bundler paths, not root shims.

Retirement condition:

- No root mode facade is ready for retirement. Removing facades would be an import-boundary change affecting App runtime, workers, history/replay, and tests.

## Symbolic Engine

Public stable surfaces:

- Root Symbolic Engine files remain the import boundary for Engine, Algebra, Equation, Calculus, Trigonometry, Display, and tests.

Compatibility shims:

- `patterns.ts`, `integration.ts`, `limits.ts`, `mixed-factor.ts`, `power-log.ts`, `radical.ts`, and `rational.ts` are district-backed public facades.

Active root surfaces:

- `differentiation.ts`, `factoring.ts`, `normalize.ts`, `orchestrator.ts`, `partials.ts`, and `precedence.ts`.

Retirement condition:

- None are ready for retirement. The active roots have broad exact-Latex and strategy-metadata blast radius; facades should remain until a dedicated symbolic root migration exists.

## Engine

Public stable surfaces:

- `math-engine.ts`, `semantic-planner.ts`, `math-analysis.ts`, and `result-guard.ts` are the Engine public root surface.

Compatibility shims:

- `math-engine.ts` and `semantic-planner.ts` are district-backed public facades.

Active root surfaces:

- `math-analysis.ts` and `result-guard.ts` remain active roots.

Retirement condition:

- No Engine public root surface is ready for retirement. Calculate, Equation, Table, Trigonometry, guarded Equation, and result rendering depend on these stable imports.

## OOE

Public stable surfaces:

- OOE now uses direct district imports, not root compatibility stubs. Public TypeScript surfaces live under `bridge-schema/`, `diagnostics/`, `job-launch/`, `pilots/`, and `runtime-control/`.

Compatibility shims:

- None retained after OOE pilot and traffic-control closure.

Active root surfaces:

- No TypeScript root OOE files remain as public facades. The active surfaces are the district entry files themselves.

Retirement condition:

- Not applicable for root stubs. Future OOE movement must preserve the current direct-import policy unless a specific milestone deliberately changes it.

## App Runtime

Public stable surfaces:

- `src/app/runtime/` hooks are AppMain-facing runtime boundaries: Calculate, Calculus, Equation, Geometry, Guide, Labs, Launcher, Linear Algebra/Table shell, Statistics, Table, Trigonometry, side surfaces, shell focus, memory persistence, and `launchWorkspaceRuntimeJob.ts`.

Internal transitional facades:

- Runtime hooks are intentionally app-internal facades over mode/workspace/OOE details. They are not public solver APIs.

Active root surfaces:

- `launchWorkspaceRuntimeJob.ts`, `useCalculatorMemoryPersistence.ts`, `useLauncherRuntime.ts`, `useShellFocusRuntime.ts`, and `useSideSurfaceRuntime.ts` remain active app orchestration roots.

Retirement condition:

- None are ready for retirement. Hook consolidation or movement should follow AppMain-specific milestones, not repo-wide facade cleanup.

## Styles

Public stable surfaces:

- `src/App.css` owns app CSS import order.
- `src/styles/app/shell.css`, `display.css`, `workspace-common.css`, `side-surfaces.css`, mode CSS files, `guide.css`, `keypad.css`, and `labs.css` are stable selector homes after `STYLES-APP-SHELL-DECOMP1`.

Compatibility shims:

- None. The former placeholder files are now real selector homes.

Active root surfaces:

- CSS files are active selector surfaces, not TypeScript facades. `shell.css` remains the shell core; Guide and Keypad retain their owned selector files.

Retirement condition:

- No CSS file is ready for retirement. Selector movement should be visual-regression gated and should not be bundled with TypeScript facade changes.

## High-Risk Contracts

- Root compatibility shims must preserve public import paths, exported names, type/value re-export behavior, source labels, exact output wording, runtime envelopes, and test imports.
- OOE is the exception to the root-stub rule: current OOE districts use direct imports with no root compatibility stubs.
- Do not use facade cleanup to change solver behavior, result wording, display/readback policy, OOE policy, schemas, capability ids, worker-host behavior, replay/history contracts, stored-value behavior, or reserved-symbol behavior.
- Do not remove a facade because it is short. One-line facades are intentionally visible compatibility seams in Algebra, Equation, Modes, Symbolic Engine, and Engine.

## Recommended Follow-Ups

- Keep root facade maps current when future district splits land.
- Consider a future `FACADE-RETIREMENT-AUDIT0` only after import-cycle and public import maps show a concrete removal candidate.
- Keep OOE direct-import policy documented separately from Equation/Algebra-style compatibility facades.
