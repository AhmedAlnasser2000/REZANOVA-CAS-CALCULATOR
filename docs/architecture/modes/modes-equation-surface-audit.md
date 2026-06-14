# Modes Equation Surface Audit

Status: audit

Purpose: document the current `src/lib/modes/equation.ts` and `src/lib/modes/equation.test.ts` surfaces before any Equation mode split. Equation mode is a product/runtime orchestration seam over Equation districts, Algebra capabilities, OOE traffic control, variable memory, workers, and display outcomes; it should not become a new solver district.

## Current Public Surface

- Request/result contracts: `RunEquationModeRequest`, `EquationModeOoePilotRunResult`, `EquationModeIsolatedWorkerRunResult`, and the public `runEquationMode` family.
- OOE snapshot helpers: `buildEquationOoeSnapshot` and `buildEquationOoeInputRevisionId` define the route snapshot/revision contract used by runtime controllers, workers, history tickets, and OOE pilots.
- Mode runners: `runEquationMode`, `runEquationModeForIsolatedWorker`, and `runEquationModeWithOoePilot` own sync, isolated-worker, and pilot-wrapped execution.
- Transform runner: `runEquationAlgebraTransform` adapts Algebra transform actions into Equation-mode outcomes.
- UI model reexports: guided polynomial helpers from `equation-ui-model.ts` remain part of the mode-facing import surface.
- Root contract test: `equation.test.ts` covers many mode-facing behavior seams and is itself an oversized cleanup candidate.

## Responsibility Map

- Request preparation: normalize Equation input, named variables, solve targets, domain intent, answer mode, exact complex form, stored-variable snapshots, and numeric interval options.
- Answer-mode routing: preserve Exact, Approximate, and Isolate guidance, including numeric interval requirements, exact-only guards, and selected-target isolation.
- Solver delegation: call Equation districts, shared Equation solve, Algebra transforms, polynomial helpers, range guards, and complex/inequality routes without absorbing their implementation ownership.
- Runtime finalization: attach runtime envelopes, stored-value detail sections, advisory metadata, safe-result guards, target readback rewrites, and answer-domain metadata.
- OOE/worker bridging: build stable revision snapshots, invoke isolated workers, preserve pilot metadata, and pass direct-symbolic worker fallback policy through existing OOE-aware runners.

## Ratchet Pressure

- `src/lib/modes/equation.ts` remains the main over-cap Modes production file.
- `src/lib/modes/equation.test.ts` remains the main over-cap Modes test file.
- The pressure is orchestration and test breadth, not a signal to move solver math into Modes.

## Future Split Candidates

- `MODES-EQUATION-TEST-SURFACE-TIDY1`: split the oversized root test into focused compatibility suites while keeping root `runEquationMode` imports where public behavior is being proven.
- `MODES-EQUATION-DISTRICT-SPLIT1`: later split private mode orchestration behind a stable `equation.ts` facade.
- Candidate private modules for a production split:
  - `types.ts` for public request/result and runner contracts.
  - `ooe-snapshot.ts` for OOE revision/snapshot helpers.
  - `stored-values.ts` for substitution policy and stored-value detail integration.
  - `outcomes.ts` for answer-mode guidance, target rewrite, safe-result guards, runtime envelope finalization, and complex guidance outcomes.
  - `polynomial-guided.ts` for guided coefficient screens and linear/polynomial system helpers.
  - `symbolic.ts` for symbolic Equation orchestration and shared-solve delegation.
  - `transforms.ts` for Equation algebra transform adaptation.
  - `run.ts` for public runner wiring, async worker wrapper, and OOE pilot wrapper.
- Keep `equation-ui-model.ts`, `equation-worker-client.ts`, and `equation.worker.ts` separate until a worker/client audit explicitly owns those paths.

## Production Split Record

- `MODES-EQUATION-DISTRICT-SPLIT1` converted root `src/lib/modes/equation.ts` into a compatibility facade.
- Private orchestration modules now live under `src/lib/modes/equation/` for request/types, OOE snapshots, outcomes, stored values, guided polynomial/system screens, selected-target parameterized routing, symbolic orchestration, transform adaptation, and public runner wiring.
- `equation-ui-model.ts`, `equation-worker-client.ts`, and `equation.worker.ts` stayed in place.
- The root production file-size baseline entry was removed after all private modules stayed under the default ratchet.

## Test-Surface Tidy Candidates

- OOE revision, snapshot, pilot, stale-assessment, and isolated-worker wrapper tests.
- Complex/domain-intent tests, including Complex Off guidance and Complex On Exact form behavior.
- Answer-mode tests for Exact, Approximate, and Isolate.
- Stored-variable, named-variable, selected-target, retargeting, and adjacent-letter product tests.
- Parameterized family tests that currently prove mode delegation across linear, polynomial, rational, carrier, exp/log, trig, composition, and mixed algebraic routes.
- Inequality, range guard, absolute-value, radical, rational, log, trig, composition, conjugate, reciprocal, system, guided polynomial, and transform tests.

## Test-Surface Tidy Record

- `MODES-EQUATION-TEST-SURFACE-TIDY1` moved the oversized root `equation.test.ts` into focused compatibility suites under `src/lib/modes/equation/`.
- The moved tests continue importing public APIs from the root `../equation` facade.
- Shared test setup now lives in `src/lib/modes/equation/test-support.ts`.
- The root test file-size baseline entry was removed after all moved suites stayed under the default ratchet.

## High-Risk Contracts

- Preserve the public `runEquationMode` request/result shape and the async worker/pilot wrapper shapes.
- Preserve OOE snapshot/revision parity, route snapshot contents, active input revision semantics, and history-ticket input identity.
- Preserve answer-mode behavior, source labels, detail/readback wording, runtime envelopes, advisories, and display outcome shape.
- Preserve domain intent and complex exact form behavior, including reserved `i` / `\imaginaryI` and ordinary `j` / `k` policy.
- Preserve stored-variable protected substitution policy, replay snapshots, named-variable syntax, selected-target readback, and retargeting behavior.
- Preserve existing solver order and delegation; a Modes split must not reorder Equation district routes or introduce new solver families.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move code or tests during this audit.
- Do not group worker/client files during this audit.
- Do not change solver behavior, output wording, display/readback policy, OOE/runtime policy, worker-host behavior, cancellation/fallback behavior, replay/history contracts, schemas, capabilities, stored-value behavior, answer-mode behavior, domain intent behavior, or reserved-symbol policy.
