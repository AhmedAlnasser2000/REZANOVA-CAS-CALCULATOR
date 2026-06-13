# Algebra Branch Assumption Surface Audit

Status: audit

Purpose: document the current Algebra branch and assumption surface before any future tidy or split. This surface is a shared metadata/readback seam for Equation, Trigonometry, Calculus, Table, symbolic-engine, and display detail sections.

## Current Public Surface

- `branch-core.ts`: branch equation sets, two-branch adapters, branch constraints, periodic family metadata, discovered-family merge, representatives, suggested intervals, piecewise branches, and structured stop reason merge.
- `assumptions-core.ts`: assumption fact kinds/sources/trust/scopes, fact keys, fact building, fact merge, fact summary, and domain-constraint-to-fact conversion.
- `assumption-adapters.ts`: adapters from rational exclusions, domain checks, branch sets/families, candidate rejections, and simplify policy into assumption facts.
- `assumption-readback.ts`: detail-section grouping, source/trust labels, dedupe, and merge behavior for display readback.
- `exact-supplements.ts`: structured exact supplement entries, legacy Latex parsing, constraint conversion, tautology filtering, dedupe, and Latex rendering.

## Responsibility Map

- Branch metadata: `branch-core.ts` owns stable dedupe/order behavior for branch equations and periodic-family metadata; callers decide when branch metadata is mathematically valid.
- Assumption facts: `assumptions-core.ts` owns the canonical fact schema and source labels, including `branch-core`, `domain-range-core`, `candidate-validation`, and `simplify-policy`.
- Adapter policy: `assumption-adapters.ts` maps solver/checker-specific evidence into assumption facts without changing the originating solver result.
- Display detail readback: `assumption-readback.ts` owns grouping and labels such as Domain Facts, Branch Facts, Interval Safety, Candidate Checking, and Trust.
- Exact supplements: `exact-supplements.ts` preserves compatibility with legacy Latex supplement lines while supporting structured entries from current solvers.

## Current Consumers

- Equation guarded, composition, substitution, polynomial carrier, and request-prep routes.
- Trigonometry rewrite routes.
- Algebra absolute-value, rational-function, polynomial-domain, inequality, value-domain, domain sampling, and transform surfaces.
- Calculus and advanced-calculus result detail sections.
- Engine/Table display readback paths.

## Future Split Candidates

- `ALGEBRA-BRANCH-CORE-TIDY1`: tidy branch metadata helpers only if branch-family metadata grows; keep the root import stable.
- `ALGEBRA-ASSUMPTION-READBACK-TIDY1`: split readback labels/grouping only if display policy needs new grouping; preserve wording unless the milestone owns copy changes.
- `ALGEBRA-EXACT-SUPPLEMENTS-DISTRICT-SPLIT1`: consider only if structured supplement parsing expands beyond current condition/exclusion/branch/principal-range support.

## High-Risk Contracts

- Preserve assumption source labels and trust labels; downstream readback and tests assert exact strings such as `branch-core` and `domain-range-core`.
- Preserve branch equation dedupe/order, branch constraint merge semantics, and two-branch pair adapters used by rewrite/substitution routes.
- Preserve periodic-family merge behavior for branches, discovered families, representatives, suggested intervals, piecewise branches, principal ranges, and structured stop reasons.
- Preserve exact supplement legacy parsing/rendering prefixes for Conditions, Exclusions, Branch conditions, and Principal range.
- Preserve display detail grouping and line dedupe; do not move display policy into OOE or solver routes.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/branch-core.test.ts src/lib/algebra/assumptions-core.test.ts src/lib/algebra/assumption-adapters.test.ts src/lib/algebra/assumption-readback.test.ts src/lib/algebra/exact-supplements.test.ts`
- `npm run test:unit -- src/lib/equation/guarded/*.test.ts src/lib/equation/shared-solve-tests/*.test.ts src/lib/modes/equation.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move code or tests during this audit.
- Do not change branch metadata shape, source labels, trust labels, supplement wording, detail-section grouping, display/readback policy, solver behavior, schemas, capabilities, OOE/runtime policy, or replay/history contracts.
- Do not introduce a generic metadata bus, display framework, or workspace-owned assumption layer.
