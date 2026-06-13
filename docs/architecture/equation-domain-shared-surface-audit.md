# Equation Domain Shared Surface Audit

Status: audit

Purpose: document the remaining active/shared Equation root surfaces after the root closure and test-surface tidy work. This is an audit-only milestone; it records ownership and future split candidates without moving production code.

## Current Public Surface

- `domain-guards.ts`: zero-form conversion, numeric evaluation, residual validation, angle-unit trig rewrites, and domain-constraint validation.
- `shared-solve.ts`: shared root solve wrapper around the guarded Equation pipeline.
- `range-impossibility.ts`: real range impossibility detection using shared Algebra range proofs.
- `complex-input-policy.ts`: reserved imaginary-unit policy for Equation complex handling.
- `equation-branch-readback.ts`: branch readback helper surface.
- `equation-history.ts`: Equation history and replay restoration helpers.
- `equation-navigation.ts`: Equation screen, menu, and selection helpers.
- `equation-ux.ts`: Equation route metadata and output summary helpers.
- `equation-inequality.ts`: public inequality facade/orchestrator over the private inequality district.

## Responsibility Map

- Domain and candidate validation support: `domain-guards.ts`, `range-impossibility.ts`, and `complex-input-policy.ts`.
- Shared solver entrypoint: `shared-solve.ts`, which should remain a thin wrapper over guarded solve unless a later shared-solve contract milestone changes that.
- Product-facing Equation shell helpers: `equation-history.ts`, `equation-navigation.ts`, and `equation-ux.ts`.
- Readback helpers: `equation-branch-readback.ts`.
- Inequality public orchestration: `equation-inequality.ts`, which coordinates private inequality modules without being a stale monolith.

## Future Split Candidates

- `domain-guards.ts` may later split into zero-form conversion, numeric substitution, residual validation, and domain-constraint validation if those helpers grow.
- `range-impossibility.ts` may later become a small district if additional range proof families or readback policies land.
- `equation-history.ts`, `equation-navigation.ts`, and `equation-ux.ts` can stay root while they remain compact; split only if Equation runtime ownership changes.
- `equation-inequality.ts` should only split further if its orchestration grows materially; current private inequality district ownership is sufficient.
- `shared-solve.ts` should not be expanded into a generic runtime framework.

## High-Risk Contracts

- Domain validation must keep current residual tolerance behavior, angle-unit numeric trig handling, domain-constraint evaluation, and candidate rejection semantics.
- Shared solve must preserve guarded stage order, trace behavior, async handoff behavior, and public root imports.
- Range impossibility must preserve current real-only proof boundaries and wording.
- Complex input policy must keep `i` / `\imaginaryI` reserved for Equation complex handling while `j` and `k` remain ordinary variables.
- History, navigation, and UX helpers must preserve replay contracts, screen ids, route metadata, and user-facing labels.
- Inequality must preserve Exact-only solving, guidance behavior, proof/detail wording, and real-line ordering under Complex intent.

## Test Gates

- `npx tsc -b --pretty false`
- Focused tests for any touched surface: domain guards, range impossibility, history, navigation, UX, inequality, shared solve, guarded solve, and Equation mode as appropriate.
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move these surfaces in a docs-only audit.
- Do not change solver behavior, output wording, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, worker-host behavior, or reserved-symbol policy.
- Do not use shared/domain cleanup to start Algebra cleanup.
- Do not introduce a global reducer, event bus, generic runtime framework, or new solver family from this surface.
