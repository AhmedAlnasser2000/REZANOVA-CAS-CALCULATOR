# Algebra Root Surface Audit

Status: audit

Purpose: document the current `src/lib/algebra/` root surface before implementation splits. Algebra is a shared capability layer used by Equation, Calculate, symbolic-engine, Calculus, Table, Linear Algebra, and display/readback helpers; it should not become workspace-owned truth.

## Current Public Surface

### Tiny Facades And Seams

- `algebra-transform.ts`: compatibility facade over `transform-core.ts`.
- `algebra-transform-ui.ts`: UI label seam for transform actions.
- `symbolic-factor.ts`: small symbolic-engine factor bridge.

### Active Shared Cores

- Variable and stored-value policy: `variable-core.ts`, `variable-memory.ts`, `variable-memory-store.ts`, `variable-hints.ts`, `named-variable.ts`.
- Assumptions and readback: `assumptions-core.ts`, `assumption-adapters.ts`, `assumption-readback.ts`, `exact-supplements.ts`, `value-domain-core.ts`.
- Domain, range, and sampling: `domain-range-core.ts`, `domain-sampling-readiness.ts`, `simplify-policy.ts`.
- Polynomial and elimination support: `polynomial-core.ts`, `polynomial-roots.ts`, `polynomial-domain-core.ts`, `polynomial-factor-solve.ts`, `polynomial-elimination-core.ts`, `polynomial-bivariate-elimination.ts`.
- Inequality support: `inequality-core.ts`, `inequality-sign-analysis-core.ts`.
- Branch and capability metadata: `branch-core.ts`, `capability-readiness.ts`.

### Over-Cap District Candidates

- `abs-core.ts`: absolute-value family recognition, branch generation, exact normalization, and numeric guidance.
- `radical-core.ts`: radical/rational-power matching, domain conditions, conjugates, and perfect-square radicands.
- `rational-function-core.ts`: exact rational normalization, denominator factorization, and partial-fraction readiness.

## Import Boundary Guidance

- Keep root imports stable until a dedicated split creates private districts behind compatibility facades.
- Product/workspace code should keep consuming Algebra as a shared capability layer, not as a workspace-owned implementation detail.
- Private district imports are allowed only after a district split creates clear ownership boundaries.
- File-size ratchet changes belong with implementation split commits, not audit-only commits.

## Current Ratchet Pressure

- `src/lib/algebra/abs-core.ts`: 2011 lines.
- `src/lib/algebra/rational-function-core.ts`: 1094 lines.
- `src/lib/algebra/radical-core.ts`: 1044 lines.

These are the only current Algebra entries in `tools/file-size-baseline.json`.

## Future Split Candidates

- Split `rational-function-core.ts` into a rational-function district after audits because it has strong focused coverage and clear helper clusters.
- Split `abs-core.ts` only after preserving the branch/readback and numeric guidance contracts documented in the Abs district audit.
- Split `radical-core.ts` only after hardening direct focused coverage for radical matching, conjugates, perfect-square radicands, and even-root conditions.
- Audit polynomial factor/bivariate surfaces later if they grow past the default ratchet or become hard to navigate.

## High-Risk Contracts

- Root public imports must remain stable for Equation, Calculate, symbolic-engine, Calculus, Table, Linear Algebra, and display/readback callers.
- Shared math cores must preserve exactness, domain/restriction readback, assumption facts, branch metadata, and bounded-family stop behavior.
- Algebra cleanup must not change solver behavior, output wording, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, or reserved-symbol policy.

## Stop Rules

- Do not split or move code during this audit.
- Do not update `tools/file-size-baseline.json` in audit-only commits.
- Do not introduce a generic algebra framework, event bus, runtime host, solver family, or workspace-specific ownership layer from this root audit.
