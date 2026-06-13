# Algebra Root Surface Audit

Status: audit + root test tidy record

Purpose: document the current `src/lib/algebra/` root surface after the district split wave. Algebra is a shared capability layer used by Equation, Calculate, symbolic-engine, Calculus, Table, Linear Algebra, and display/readback helpers; it should not become workspace-owned truth.

## Current Public Surface

### Tiny Facades And Seams

- `abs-core.ts`, `radical-core.ts`, `rational-function-core.ts`, `transform-core.ts`, `variable-core.ts`, `variable-memory.ts`, `domain-range-core.ts`, `polynomial-factor-solve.ts`, `polynomial-elimination-core.ts`, `polynomial-bivariate-elimination.ts`, `inequality-core.ts`, `inequality-sign-analysis-core.ts`, and `polynomial-core.ts`: compatibility facades over district implementations.
- `algebra-transform.ts`: compatibility facade over `transform-core.ts`.
- `algebra-transform-ui.ts`: UI label seam for transform actions.
- `symbolic-factor.ts`: small symbolic-engine factor bridge.

### Active Shared Cores

- Variable and stored-value policy: `variable-memory-store.ts`, `variable-hints.ts`, `named-variable.ts`, plus district-backed `variable-core.ts` and `variable-memory.ts` facades.
- Assumptions and readback: `assumptions-core.ts`, `assumption-adapters.ts`, `assumption-readback.ts`, `exact-supplements.ts`, `value-domain-core.ts`.
- Domain, range, and sampling: `domain-sampling-readiness.ts`, `simplify-policy.ts`, plus the district-backed `domain-range-core.ts` facade.
- Polynomial and elimination support: `polynomial-roots.ts`, `polynomial-domain-core.ts`, plus district-backed polynomial core/factor/elimination facades.
- Inequality support: district-backed `inequality-core.ts` and `inequality-sign-analysis-core.ts` facades.
- Branch and capability metadata: `branch-core.ts`, `capability-readiness.ts`.

### Remaining Root Tests

- Root tests now remain only for active root seams and shared surfaces: algebra transform UI/facade, branch/assumption/readback, capability readiness, domain sampling, exact supplements, named variables, polynomial domain/roots, simplify policy, value-domain metadata, and variable hints.
- Tests for district-backed root facades moved into their districts while continuing to import the root facades where compatibility is being proven.

## Import Boundary Guidance

- Keep root imports stable until a dedicated split creates private districts behind compatibility facades.
- Product/workspace code should keep consuming Algebra as a shared capability layer, not as a workspace-owned implementation detail.
- Private district imports are allowed only after a district split creates clear ownership boundaries.
- File-size ratchet changes belong with implementation split commits, not audit-only commits.

## Current Ratchet Pressure

- No current Algebra root file requires a file-size baseline entry.
- District internals remain below the default cap after the latest split wave.

## Future Split Candidates

- Consider `ALGEBRA-VARIABLE-HINTS-TIDY1` only if hint wording or precedence grows.
- Consider a narrow branch/assumption or exact-supplement tidy only if metadata/readback responsibilities grow; preserve exact source labels and wording.
- Keep `polynomial-roots.ts` and `polynomial-domain-core.ts` as active root surfaces until a dedicated milestone owns numeric-root or domain wording risk.

## Root Test Surface Tidy Record

- `ALGEBRA-ROOT-TEST-SURFACE-TIDY1`: moved district-backed root facade tests into their districts.
- Moved test groups for absolute value, radical, rational-function, transform-core, variable-core, variable-memory, domain-range, polynomial-factor, polynomial-elimination, inequality, and polynomial-core.
- Kept tests importing root facades where compatibility is under test.
- Left active root-surface tests in place for polynomial roots/domain, branch/assumption/readback, exact supplements, variable hints, named variables, domain sampling, value-domain, simplify policy, capability readiness, and algebra transform.

## High-Risk Contracts

- Root public imports must remain stable for Equation, Calculate, symbolic-engine, Calculus, Table, Linear Algebra, and display/readback callers.
- Shared math cores must preserve exactness, domain/restriction readback, assumption facts, branch metadata, and bounded-family stop behavior.
- Algebra cleanup must not change solver behavior, output wording, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, or reserved-symbol policy.

## Stop Rules

- Do not move root facades without a dedicated public-import migration milestone.
- Do not move active root-surface tests into districts unless the corresponding production surface has a district-backed facade.
- Do not update `tools/file-size-baseline.json` for test relocation unless the ratchet requires it.
- Do not introduce a generic algebra framework, event bus, runtime host, solver family, or workspace-specific ownership layer from this root audit.
