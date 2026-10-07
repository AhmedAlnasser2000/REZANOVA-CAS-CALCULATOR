# TESTS-LEGACY-EQUATION-INERT1: Old Equation Engine Tests Made Inert

Date: 2026-10-05
Status: implemented and verified on 2026-10-05. Moved onto main's schema 7 (CANONICAL-RESULT-CONSOLIDATION) and verified again on 2026-10-07. It ships in one PR with [`NEW-EQUATION-RESPONSIVE1`](new-equation-responsive1.md) and the Example-menu colour fix.

## User decisions (2026-10-05)

- **Scope**:
  - Tests of the old Equation engine's behaviour are inert in every full run.
  - The old Equation workspace and its logic stay.
  - Tests that only pass through the Equation menu or workspace while checking shell behaviour keep running.
- **On demand**: manual scripts only, with no CI job.
- **CI**: `test:equation-solve-result` is removed from `ci.yml` and `release-linux.yml`, and the old-Equation files are removed from `test:feature-probes`.
- **Golden ratchet**: New Equation and New Integration get two golden cases each. This closes the "two cases per launcher workspace" gap that was already red on main for New Integration.
- **Delivery**: a separate gate after `EQUATION-ADOPTION1`. On 2026-10-07 the user grouped it with the New Equation responsiveness fixes in one PR, one commit per fix.

## Mechanism

- **One list**: `tools/legacy-equation-tests.mjs` holds the legacy globs and reads the flag `CALCWIZ_LEGACY_EQUATION=1`.
- **Whole files**:
  - excluded from `vitest.config.ts` (unit) and `vitest.ui.config.ts` (UI) through `exclude`;
  - ignored by `playwright.config.ts` through `testIgnore`;
  - included again whenever the flag is set.
- **Shared files**:
  - `legacyEquationIt` (`src/test/legacy-equation.ts`, re-exported by `src/test/renderAppMain.tsx`) and `legacyEquationTest` (`e2e/legacy-equation.ts`) mark individual tests;
  - they run only when the flag is set.
- **Golden runner**: the `equation` cases are filtered out unless the flag is set, and the "two cases per launcher workspace" rule skips `equation` the same way.
- **Contract ratchets keep their evidence** (AGENTS.md forbids weakening coverage invariants and enforcement ratchets):
  - the runtime coverage, MathJSON coverage, result-intent and V2 supplement suites read `CONTRACT_GOLDEN_CASES`: all 47 cases on the generic contract, old Equation included;
  - print hygiene reads `ALL_GOLDEN_CASES` (51); its baseline gained the 4 new cases and lost none.
  - These 6 old-Equation executions (a few seconds) therefore still run in full runs, as contract evidence rather than behaviour tests.
- **Scripts**: `npm run test:legacy-equation`, `test:legacy-equation:ui` and `test:legacy-equation:e2e` (the last after `npm run build`). Each sets the flag and lists exactly the legacy files.

## What is inert

| Area | Files or tests |
| --- | --- |
| Unit | `src/lib/equation/**`, `src/lib/modes/equation/**`, `src/lib/modes/equation-complex-stability.test.ts`, `src/lib/ooe/pilots/equation-pilot.test.ts` |
| UI, whole files | `useEquationRuntime.ui.test.tsx`, `AppMain.complex`, `AppMain.formula-presentation`, `AppMain.numeric-interval-guidance` |
| UI, shared files | 69 old-Equation tests in `AppMain.ui.test.tsx` and 1 in `AppMain.workspace-tabs.ui.test.tsx` |
| e2e, whole files | `equation-card-credibility.spec.ts`, `equation-systems-locus-readback-repair.spec.ts` |
| e2e, shared files | 37 old-Equation smokes in `qa1-smoke.spec.ts` and 1 in `canonical-result-v2-supplement-table.spec.ts` |
| Golden runner | the 6 `equation` cases; the behaviour corpus is 45 cases (51 with the flag) |

## What stays on

- **Shared shell tests** keep running: menu inspector, variable hints, Equation Home back and Escape, the Labs preview, launcher tabs, and the Calculate→Equation auto-switch.
- **Worker and controller plumbing tests** keep running: `equation-worker-runtime.test.ts`, `equationHistorySeed.test.ts` and `equationNumericPreparationController.test.ts`.
- **Workspace checks** keep running: the per-workspace browser canaries and the History replay ratchet.
- **Feature-probe registry**: it still statically checks that its old-Equation probe tests exist. Those probes are not executed in CI; they run in `test:legacy-equation`.

## Golden cases for the new workspaces

- **Why a separate path**: the generic result consumer refuses the typed schema-7 answer kinds by design, so golden execution has a typed path for them.
- **New Equation**: the case runs its worker service and is checked through its presentation (`presentedText`).
- **New Integration**: the case runs its worker service and is checked through `readIntegrationPresentation`. Nothing under `src/lib/calculus/new-integration/` is edited.
- **Print hygiene**: it scans the canonical math leaves of their schema-7 documents.
