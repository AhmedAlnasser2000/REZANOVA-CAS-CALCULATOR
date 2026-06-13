# Modes Root Surface Audit

Status: superseded by `docs/architecture/modes-surface-roadmap-audit.md` for current roadmap pressure

Purpose: document the current `src/lib/modes/` root surface before any structural cleanup. Modes translate shared math capabilities into product-facing mode requests, worker hosts, runtime envelopes, history-safe outcomes, and tests; they should stay distinct from Algebra/Equation solver ownership and from OOE traffic-control policy.

Note: this audit was recorded before `MODES-EQUATION-TEST-SURFACE-TIDY1` and `MODES-EQUATION-DISTRICT-SPLIT1`. Use `modes-surface-roadmap-audit.md` for the current post-Equation sweep and next milestone recommendation.

## Current Public Surface

- Heavy mode orchestrators: `equation.ts` owns the broad Equation mode runtime surface; `calculate.ts` owns Calculate quickform execution; `table-core.ts` owns table request preparation and output assembly.
- Thin mode facades: `calculus.ts`, `geometry.ts`, `statistics.ts`, `trigonometry.ts`, `table.ts`, `matrix.ts`, `vector.ts`, and `core-mode.ts` are small public seams for already-separated engines or workspace identities.
- Worker entrypoints: `*.worker.ts` files are bundler entrypoints and must keep stable import paths unless a dedicated worker-entrypoint migration owns the move.
- Worker clients: `*-worker-client.ts` files own isolated-worker startup, fallback, cancellation, host execution evidence, and request/response message handling.
- Tests: `equation.test.ts` and `calculate.test.ts` are broad mode contract tests; smaller worker-runtime/client tests cover host fallback and worker behavior.

## Responsibility Map

- Mode runtime orchestration: convert typed mode requests into `DisplayOutcome`/runtime responses, apply stored-variable policy, attach runtime envelopes, and preserve replay/history-compatible request snapshots.
- Worker runtime boundary: worker clients and worker files expose isolated execution without changing mode identity, capability identity, or OOE host metadata.
- Cross-mode seams: shared OOE pilots, Algebra transforms, variable memory, Equation districts, table sampling, and worker runtime config are consumed from Modes but not owned by Modes.
- UI model seams: small mode-local helpers such as `equation-ui-model.ts` and `calculate-navigation.ts` keep view-specific request/readback support out of large runtime files.

## Ratchet Pressure

- `src/lib/modes/equation.ts`: over-cap mode orchestrator.
- `src/lib/modes/equation.test.ts`: over-cap root mode test.
- `calculate.ts`, `calculate.test.ts`, and `table.test.ts` are navigation pressure points but currently below the default cap.
- OOE and worker/client files are numerous, but most individual files remain under the cap.

## Future Split Candidates

- `MODES-EQUATION-SURFACE-AUDIT0`: audit Equation mode separately before splitting because it crosses answer modes, domain intent, workers, OOE, replay/history, variable substitution, and many Equation districts.
- `MODES-EQUATION-TEST-SURFACE-TIDY1`: split the oversized Equation mode test before or alongside production cleanup so refactor gates stay readable.
- `MODES-EQUATION-DISTRICT-SPLIT1`: later split Equation mode helpers behind a stable `equation.ts` facade without moving solver ownership out of `src/lib/equation/`.
- `MODES-WORKER-CLIENT-SURFACE-AUDIT0`: consider grouping workers and clients into folders only after auditing bundler entrypoint constraints, import paths, host ids, fallback tests, and Vite/Tauri worker construction behavior.
- `MODES-CALCULATE-SURFACE-AUDIT0`: consider only after Equation pressure is reduced; preserve Calculate as compact quickform rather than a guided topic workspace.

## High-Risk Contracts

- Preserve public mode function/type imports used by AppMain, runtime controllers, worker entrypoints, UI tests, and history/replay callers.
- Preserve worker host ids, fallback host ids, cancellation wording, startup timeout behavior, hard-stop behavior, and runtime host execution evidence.
- Preserve OOE input revision snapshots, runtime envelopes, stored-variable substitution policy, history/replay snapshots, capability ids, and existing display/readback wording.
- Do not use Modes cleanup to move solver logic from Algebra, Equation, Calculus, Trigonometry, Geometry, Statistics, Table, or OOE into Modes.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move code or tests during this audit.
- Do not group worker or client files yet; that requires its own audit or implementation milestone.
- Do not change solver behavior, output wording, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, worker-host behavior, startup/fallback behavior, or reserved-symbol policy.
