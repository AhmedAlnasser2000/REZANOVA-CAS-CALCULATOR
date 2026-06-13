# Equation Root Facade Audit

Status: audit note

Purpose: map the current `src/lib/equation/` root after the Candidate and Target surface splits. This note is audit-only; it does not authorize solver behavior, display/readback, OOE/runtime, replay/history, schema, worker-host, capability, or reserved-symbol changes.

## Current Root Surface

### Public Compatibility Facades

These files are intentionally small import anchors. Keep callers importing through them unless a later milestone explicitly changes a public boundary.

- `candidate-rejection.ts`: re-exports candidate rejection helpers from `candidate/`.
- `candidate-validation.ts`: re-exports numeric candidate validation helpers from `candidate/`.
- `composition-core.ts`: re-exports composition core helpers from `composition/`.
- `composition-stage.ts`: re-exports the composition solve stage from `composition/`.
- `equation-algebraic-isolation.ts`: re-exports algebraic isolation types and solver from `isolation/`.
- `equation-complex.ts`: re-exports the Complex Exact solver from `complex/`.
- `equation-selected-target-isolation.ts`: re-exports selected-target isolation types and solvers from `isolation/`.
- `equation-target.ts`: re-exports the active solve-target surface from `target/`.
- `equation-target-resolution.ts`: re-exports the target-resolution compatibility helper from `target/`.
- `guarded-solve.ts`: re-exports the public guarded solve runtime surface from `guarded/run`.
- `substitution-solve.ts`: re-exports substitution matching types and solver from `substitution/`.

### Active Root Surfaces

These files still own live root-level behavior or entrypoint roles and should not be collapsed during facade tidy.

- `complex-input-policy.ts`: shared Equation complex input policy for reserved imaginary-unit handling.
- `domain-guards.ts`: residual validation, numeric evaluation, angle-unit trig rewrites, and domain-condition checks.
- `equation-branch-readback.ts`: branch readback helpers shared by exact routes.
- `equation-direct-symbolic-worker-client.ts`: direct-symbolic worker client and host boundary.
- `equation-direct-symbolic.worker.ts`: direct-symbolic worker entrypoint.
- `equation-history.ts`: Equation history/replay serialization helpers.
- `equation-inequality.ts`: public inequality facade with light orchestration over the inequality district.
- `equation-navigation.ts`: Equation screen/navigation helpers.
- `equation-polynomial-domain.ts`: polynomial-domain helpers.
- `equation-polynomial-system.ts`: polynomial system solving surface.
- `equation-ux.ts`: Equation UX/output helper surface.
- `numeric-interval-solve.ts`: numeric interval solving surface.
- `polynomial-carrier-follow-on.ts`: polynomial-carrier follow-on solving surface.
- `range-impossibility.ts`: real range impossibility helpers.
- `shared-solve.ts`: shared Equation solve orchestration surface.

### Root Test Surface

Root tests remain useful when they exercise public root surfaces or broad route contracts. Do not relocate them merely to reduce visual clutter. Candidate and Target tests were moved because those districts now own focused public-facade compatibility tests.

## Recommended Tidy Actions

- Add short compatibility-facade comments to the one-line root facades so they stop looking accidental.
- Normalize mixed type/value facade exports where the current style is inconsistent, without changing exported names.
- Leave active root surfaces and broad root tests in place.
- Do not delete root facades unless a separate implementation milestone proves all public imports and compatibility callers have moved.

## Deferred District Candidates

- `domain-guards.ts`: possible future domain/residual validation district.
- `numeric-interval-solve.ts`: possible future numeric interval district.
- `polynomial-carrier-follow-on.ts` and `equation-polynomial-system.ts`: possible future polynomial follow-on/system district.
- `shared-solve.ts`: possible future shared solve orchestrator audit before any split.
- `equation-history.ts` and `equation-navigation.ts`: possible future root-adapter cleanup only if App/runtime callers need it.

## High-Risk Contracts

- Root facades are public import boundaries; deleting or bypassing them can break callers even when the target file is tiny.
- Candidate validation messages, candidate rejection kinds, assumption source labels, residual tolerance, and domain validation behavior must remain stable.
- Target selection must preserve named variables, raw adjacent-letter multiplication, selected-target fallback, reserved `i` / `\imaginaryI`, ordinary `j` / `k`, retargeting to `x`, and outcome rewrite behavior.
- Active root surfaces must preserve solver order, display/readback policy, OOE/runtime behavior, replay/history contracts, schemas, capabilities, worker-host behavior, and reserved-symbol policy.
- Worker entrypoints and root compatibility files should not gain broad imports that change bundle or worker loading behavior.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- For facade tidy: run focused tests for any root facade touched, plus `git diff --check`.
- For future active-surface splits: add route-specific unit tests before committing.

## Stop Rules

- Do not implement `EQUATION-ROOT-FACADE-TIDY1` in this audit.
- Do not edit `src/lib/equation/*.ts` code files for this milestone.
- Do not move active root surfaces under new districts in this milestone.
- Do not remove root facades just because they are one-line files.
- Do not change solver behavior, output wording, display/readback, OOE/runtime, replay/history, schema, capability, worker-host, or reserved-symbol policy.
