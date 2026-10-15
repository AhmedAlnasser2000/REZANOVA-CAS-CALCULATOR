/**
 * Tests of the retired workspaces, kept on disk but not run (EQUATION-RECONSTRUCTION-CLOSEOUT1 PR B, user decisions
 * 2026-10-15). Equation (New Equation), New Integration, Graphing, Notebook, Settings, History and Guide keep their
 * tests; so do the internals (OOE, Surface Protocol, compartments, goldens, ratchets) and every Integration test, which
 * the Integration program owns. Each file comes back when its workspace is rebuilt on a new engine.
 *
 * Read by vitest.config.ts, vitest.ui.config.ts and playwright.config.ts; checked by
 * src/lib/workspaces/retired-workspace-tests.test.ts (every entry names files that exist, none in a kept area).
 */

/** Whole folders that belong to a retired workspace. */
export const RETIRED_WORKSPACE_TEST_FOLDERS = [
  'src/lib/trigonometry/**', // Trigonometry
  'src/lib/statistics/**', // Statistics
  'src/lib/geometry/**', // Geometry
  'src/lib/labs/**', // Labs
  'src/app/workspaces/**', // Calculus, Matrix/Vector and Statistics editors
  'src/app/shell/statistics/**', // Statistics
];

/** Tests of retired workspaces in shared folders: Calculate, Table, Matrix/Vector, old Calculus, the calculator keypad. */
export const RETIRED_WORKSPACE_TEST_FILES = [
  'src/app/logic/expressionRouting.test.ts',
  'src/app/logic/keypadRouter.test.ts',
  'src/app/logic/primaryActionRouter.test.ts',
  'src/app/logic/softActionRouter.test.ts',
  'src/app/runtime/calculus-derivative-source.test.ts',
  'src/app/runtime/linearAlgebraActionRequest.test.ts',
  'src/app/runtime/statistics-data-conversion.test.ts',
  'src/app/runtime/useCalculateRuntime.ui.test.tsx',
  'src/app/runtime/useCalculusRuntime.ui.test.tsx',
  'src/app/runtime/useGeometryRuntime.ui.test.tsx',
  'src/app/runtime/useLinearAlgebraMatrixProfileRuntime.ui.test.tsx',
  'src/app/runtime/useLinearAlgebraMultiVectorEditorRuntime.ui.test.tsx',
  'src/app/runtime/useLinearAlgebraNamedReplay.ui.test.tsx',
  'src/app/runtime/useLinearAlgebraTableShellRuntime.canonicalization.ui.test.tsx',
  'src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx',
  'src/app/runtime/useStatisticsRuntime.ui.test.tsx',
  'src/app/runtime/useTableRuntime.ui.test.tsx',
  'src/app/runtime/useTrigonometryRuntime.ui.test.tsx',
  'src/components/LabsPanel.ui.test.tsx',
  'src/lib/calculus/calculus-strategy.test.ts',
  'src/lib/calculus/calculus-workbench.test.ts',
  'src/lib/calculus/derivative-operator.test.ts',
  'src/lib/calculus/derivative-request.test.ts',
  'src/lib/calculus/engine/adaptive-simpson.test.ts',
  'src/lib/calculus/engine/finite-limit-target.test.ts',
  'src/lib/calculus/engine/limit-heuristics.test.ts',
  'src/lib/calculus/limit-ledger-corpus.test.ts',
  'src/lib/calculus/limit-piecewise-row-editor.test.ts',
  'src/lib/calculus/limit-request.test.ts',
  'src/lib/calculus/limit-route-classifier.test.ts',
  'src/lib/calculus/limit-route-corpus.test.ts',
  'src/lib/calculus/limit-route-orchestrator.test.ts',
  'src/lib/calculus/workspace/implicit-derivative.test.ts',
  'src/lib/calculus/workspace/laplace.test.ts',
  'src/lib/calculus/workspace/limits.test.ts',
  'src/lib/calculus/workspace/navigation.test.ts',
  'src/lib/calculus/workspace/ode.test.ts',
  'src/lib/calculus/workspace/partials.test.ts',
  'src/lib/calculus/workspace/result-document.test.ts',
  'src/lib/calculus/workspace/series.test.ts',
  'src/lib/calculus/workspace/ui.test.ts',
  'src/lib/linear-algebra/decimal-readback.test.ts',
  'src/lib/linear-algebra/editor-dispatch-matrix-expressions.test.ts',
  'src/lib/linear-algebra/editor-dispatch-named-values.test.ts',
  'src/lib/linear-algebra/editor-dispatch.test.ts',
  'src/lib/linear-algebra/editor-parser.test.ts',
  'src/lib/linear-algebra/matrix-core.test.ts',
  'src/lib/linear-algebra/matrix-definiteness.test.ts',
  'src/lib/linear-algebra/matrix-eigen.test.ts',
  'src/lib/linear-algebra/matrix-invertibility.test.ts',
  'src/lib/linear-algebra/matrix-linear-map-profile.test.ts',
  'src/lib/linear-algebra/matrix-spaces.test.ts',
  'src/lib/linear-algebra/matrix-svd.test.ts',
  'src/lib/linear-algebra/matrix-system.test.ts',
  'src/lib/linear-algebra/matrix.test.ts',
  'src/lib/linear-algebra/runtime-request.test.ts',
  'src/lib/linear-algebra/typed-expression.test.ts',
  'src/lib/linear-algebra/vector-core.test.ts',
  'src/lib/linear-algebra/vector-family.test.ts',
  'src/lib/linear-algebra/vector.test.ts',
  'src/lib/modes/calculate-navigation.test.ts',
  'src/lib/modes/calculate-worker-runtime.test.ts',
  'src/lib/modes/calculate/ooe-snapshot.test.ts',
  'src/lib/modes/calculate/standard.test.ts',
  'src/lib/modes/calculate/transforms.test.ts',
  'src/lib/modes/calculus-worker-client.test.ts',
  'src/lib/modes/geometry-worker-runtime.test.ts',
  'src/lib/modes/linear-algebra-worker-runtime.test.ts',
  'src/lib/modes/matrix.test.ts',
  'src/lib/modes/statistics-worker-runtime.test.ts',
  'src/lib/modes/table-worker-runtime.test.ts',
  'src/lib/modes/table.test.ts',
  'src/lib/modes/trigonometry-worker-runtime.test.ts',
  'src/lib/modes/vector.test.ts',
];

/**
 * Old-engine tests that no kept workspace and no Integration code imports (checked by import graph).
 * src/lib/engine/math-engine/numeric-evaluation.test.ts stays: the feature-probe ratchet runs it.
 */
export const RETIRED_ENGINE_TEST_FILES = [
  'src/lib/algebra/algebra-transform.test.ts',
  'src/lib/algebra/branch-core.test.ts',
  'src/lib/algebra/capability-readiness.test.ts',
  'src/lib/algebra/domain-range/domain-range-core.test.ts',
  'src/lib/algebra/domain-sampling-readiness.test.ts',
  'src/lib/algebra/inequality/inequality-core.test.ts',
  'src/lib/algebra/inequality/inequality-sign-analysis-core.test.ts',
  'src/lib/algebra/polynomial-domain-core.test.ts',
  'src/lib/algebra/polynomial-factor/polynomial-factor-solve.test.ts',
  'src/lib/algebra/radical/radical-core.test.ts',
  'src/lib/algebra/transform-core/transform-core.test.ts',
  'src/lib/algebra/variable-core/variable-core.test.ts',
  'src/lib/algebra/variable-hints.test.ts',
  'src/lib/engine/math-analysis.test.ts',
  'src/lib/engine/math-engine/calculus.test.ts',
  'src/lib/engine/math-engine/contract.test.ts',
  'src/lib/engine/math-engine/factorization.test.ts',
  'src/lib/engine/math-engine/symbolic-simplify.test.ts',
  'src/lib/engine/result-guard.test.ts',
  'src/lib/engine/semantic-planner.test.ts',
  'src/lib/symbolic-engine/factoring.test.ts',
  'src/lib/symbolic-engine/limits.test.ts',
  'src/lib/symbolic-engine/limits/abs-side-behavior.test.ts',
  'src/lib/symbolic-engine/limits/complex-domain.test.ts',
  'src/lib/symbolic-engine/limits/detail-intent.test.ts',
  'src/lib/symbolic-engine/limits/detail-readback.test.ts',
  'src/lib/symbolic-engine/limits/finite-leading-terms.test.ts',
  'src/lib/symbolic-engine/limits/gruntz-finite-bridge.test.ts',
  'src/lib/symbolic-engine/limits/gruntz-foundation.test.ts',
  'src/lib/symbolic-engine/limits/gruntz-recursive-evaluator.test.ts',
  'src/lib/symbolic-engine/limits/gruntz-sign-extraction.test.ts',
  'src/lib/symbolic-engine/limits/infinity-scale-terms.test.ts',
  'src/lib/symbolic-engine/limits/lhospital.test.ts',
  'src/lib/symbolic-engine/limits/mrv-lite.test.ts',
  'src/lib/symbolic-engine/limits/piecewise-limits.test.ts',
  'src/lib/symbolic-engine/limits/symbolic-infinity-cases.test.ts',
  'src/lib/symbolic-engine/mixed-factor.test.ts',
  'src/lib/symbolic-engine/orchestrator.test.ts',
  'src/lib/symbolic-engine/partials.test.ts',
  'src/lib/symbolic-engine/power-log.test.ts',
  'src/lib/symbolic-engine/radical.test.ts',
  'src/lib/symbolic-engine/rational.test.ts',
];

/** Internal tests that exercise only a retired workspace. */
export const RETIRED_INTERNAL_TEST_FILES = [
  'src/lib/result-contract/linear-algebra-authority.test.ts',
  'src/lib/result-contract/linear-algebra-v2.test.ts',
  'src/lib/result-contract/trigonometry-period-phase-v2.test.ts',
];

/** Browser specs that drive a retired workspace, which can no longer be opened. */
export const RETIRED_BROWSER_SPECS = [
  // Calculate
  'e2e/calc-audit0-smoke.spec.ts',
  'e2e/qa1-smoke.spec.ts',
  // old Calculus, including its integral UI (the Integration unit tests keep running)
  'e2e/algebraic-genus1-quality-gate.spec.ts',
  'e2e/algebraic-integration-ui-evidence.spec.ts',
  'e2e/algebraic-readback-smoke.spec.ts',
  'e2e/calculus-input-notation-repair.spec.ts',
  'e2e/calculus-limit-gruntz-orchestration.spec.ts',
  'e2e/calculus-native-ir-gate.spec.ts',
  // Matrix / Vector
  'e2e/canonical-result-v2-linear-algebra.spec.ts',
  'e2e/linear-algebra-*.spec.ts',
  'e2e/matrix-*.spec.ts',
  'e2e/vector-*.spec.ts',
  // Table
  'e2e/canonical-result-v2-supplement-table.spec.ts',
  // Trigonometry
  'e2e/canonical-result-v2-request-evidence.spec.ts',
  'e2e/canonical-result-v2-trigonometry.spec.ts',
  // Statistics
  'e2e/statistics-*.spec.ts',
  // internals that drive retired workspaces (user decision: excluded)
  'e2e/canonical-current-calculate.spec.ts',
  'e2e/canonical-current-modern.spec.ts',
  'e2e/clipboard-capability-audit.spec.ts',
  'e2e/history-replay-ratchet.spec.ts',
];

/** Every unit and UI test exclusion, as globs relative to the repository root. */
export const RETIRED_VITEST_EXCLUDES = [
  ...RETIRED_WORKSPACE_TEST_FOLDERS,
  ...RETIRED_WORKSPACE_TEST_FILES,
  ...RETIRED_ENGINE_TEST_FILES,
  ...RETIRED_INTERNAL_TEST_FILES,
];
