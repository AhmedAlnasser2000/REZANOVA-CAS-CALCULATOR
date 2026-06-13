# Equation Root Closure Audit

Status: closure audit

Purpose: record the post-district-split Equation root state before moving on to non-Equation cleanup. This audit closes the current root cleanup sequence by correcting facade drift, naming the active root surfaces that intentionally remain, and setting stop rules for any later Equation work.

## Current Root Classification

### Stable Compatibility Facades

These files intentionally preserve root imports while implementation lives in a private district:

- Candidate, target, composition, complex, isolation, guarded, substitution, numeric interval, polynomial, and direct-symbolic worker facade files.
- One-line or tiny facade files are intentional and should not be removed merely because they look empty.

### Intentional Active Roots

These files still own small root-level behavior:

- `complex-input-policy.ts`: shared Equation imaginary-unit policy.
- `domain-guards.ts`: zero-form conversion, numeric substitution, residual checks, angle-unit trig rewrites, and domain-constraint evaluation.
- `equation-branch-readback.ts`: branch readback helpers.
- `equation-history.ts`: history/replay helpers for Equation entries.
- `equation-navigation.ts`: Equation route/menu helpers.
- `equation-ux.ts`: route metadata and output summary helpers.
- `range-impossibility.ts`: real range impossibility detection over shared Algebra range proofs.
- `shared-solve.ts`: root shared solve wrapper over the guarded pipeline.

### Active Facade/Orchestrator

- `equation-inequality.ts` remains a public inequality facade with light route orchestration over the private `inequality/` district. It is not a stale root blob.

### Root Test Surface

- Broad root tests may remain at root only when they verify public root surfaces or cross-route contracts.
- Oversized root tests should move into focused test-surface files while continuing to import the root facade they prove.

## Drift Fixed In This Audit

- `numeric-interval-solve.ts` is now a compatibility facade for `numeric-interval/solve`, not an active root solver surface.
- The root surface map now separates stable facades, intentional active roots, the inequality active facade/orchestrator, and root test-surface policy.

## High-Risk Contracts

- Root imports remain stable for app, mode, worker, Equation history, and cross-district callers.
- Facade cleanup must not change solver order, output wording, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, worker-host behavior, or reserved-symbol policy.
- `i` / `\imaginaryI` remains reserved for Equation complex handling; `j` and `k` remain ordinary variables.

## Recommended Next Actions

- Split oversized root tests into focused test-surface files without changing assertions or public imports.
- Audit remaining domain/shared active roots before deciding whether any deserve a later implementation split.
- Defer Algebra cleanup until Equation closure records and root test-surface tidy are complete.

## Stop Rules

- Do not delete root facades just because they are small.
- Do not fold active root surfaces into unrelated districts without a dedicated audit/split milestone.
- Do not use closure cleanup as a vehicle for new Equation families, graphing, OOE host changes, display-policy changes, or replay/schema changes.
