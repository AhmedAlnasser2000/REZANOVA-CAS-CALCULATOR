## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Program

- task_id: CALCULUS-INTEGRATION-AUTHORITY-GENUS1-NEXT100-FIX1
- scope: Indefinite Calculus integration authority, generic cubic genus-1 second-kind integration, 21 regression fixes, and regression-ledger promotion.
- status: in-progress
- user_commit_approval: approved for every named gate on 2026-07-16
- lane_boundary: Exclude Equation, definite/improper integration, frozen shared Calculus V1 adapters, Notebook, Linear Algebra, and unrelated memory edits.

## Prerequisites

- representation: V2 standard MathJSON leaves plus an additive typed V4 special-function expression contract.
- symbolic_primitives: Calculus-owned native antiderivative expression, exact rational arithmetic, symbolic differentiation, and existing elliptic root charts.
- facts: route-owned domain, branch, nonzero-slope, denominator-exclusion, and degeneration evidence.
- validation: producer-owned authority validation and exact derivative backcheck before adoption.
- readback: canonical presentation derived from native expression authority, including structured `+C`.
- tests: focused Vitest, focused backend runs, mandatory Playwright, contract ratchets, corpus validation, TypeScript, file-size, memory, and diff hygiene.

## Gate Status

- `CANONICAL-RESULT-V4-SPECIAL-FUNCTION-EXPRESSION1`: verified
- `CALCULUS-INTEGRATION-NATIVE-RESULT-IR1`: verified
- `CALCULUS-INTEGRATION-V2-AUTHORITY-MIGRATION1`: verified
- `CALCULUS-INTEGRATION-V4-SPECIAL-MIGRATION1`: verified
- `ALGEBRAIC-GENUS1-CUBIC-HERMITE-PRECONDITIONER1`: verified
- `ALGEBRAIC-GENUS1-SECOND-KIND-LIVE1`: verified
- `CALCULUS-INTEGRATION-SUBSTITUTION-ROOT-GAPS2`: pending
- `CALCULUS-INTEGRATION-TRIG-IBP-FORMAL2`: pending
- `CALCULUS-INTEGRATION-NEXT100-REGRESSION-PROMOTION1`: pending

## Completed Gate 1

- Added additive Canonical Result V4 authority for bounded typed expressions containing approved named special functions.
- V4 supports standard-math leaves, named calls, sums, products, quotients, powers, negation, and piecewise branches.
- Approved names and arities are exact: `erfi`, `Si`, `Ci`, `Ei`, `li`, `EllipticF`, `EllipticE`, and `EllipticPi`.
- Every ordinary leaf and piecewise condition must retain producer-proven standard MathJSON; V4 rejects custom MathJSON operators inside those leaves.
- Deterministic rendering feeds normalized consumers, History, clipboard/Copy Result, and editor transfer without reparsing rendered output.
- No live producer selects V4 in this gate, so current app output is unchanged.

## Completed Gate 2

- Added a Calculus-owned antiderivative expression carrying standard MathJSON or typed V4 special-function structure plus route-owned fact/detail nodes.
- Native authority survives scalar and additive composition, normal-form and trig retries, symbolic adoption, and Compute Engine fallback; string-only routes remain explicitly transitional for the following migration gates.
- Native standard candidates are differentiated directly from AST and canonical LaTeX is rendered from structure rather than reparsed for meaning.
- Verified indefinite families add `C` structurally on the right only after derivative backcheck.
- Migrated foundational direct polynomial/power primitives as the first live native family and kept visible output as one antiderivative expression.
- The frozen V1 runtime does not expose the core Trust section for the direct polynomial Playwright case; Gate 3 owns the V2 runtime authority handoff and Trust visibility rather than changing the frozen adapter here.

## Completed Gate 3

- Migrated ordinary indefinite-integration successes and math-bearing controlled errors onto Calculus-owned V2 authority through integration-specific adapters, without editing the frozen shared Calculus V1 adapter boundary.
- Preserved one visible antiderivative expression, structural right-hand `+C`, and route-owned fact/detail sections while routing Copy Result, To Editor, History replay, and runtime outcomes from native authority rather than reparsing rendered LaTeX.
- Fail-closed Compute Engine fallback now rejects untrusted symbolic candidates; unsupported indefinite cases receive an app-visible Integration Boundary detail when no more specific route detail exists.
- Threaded native expressions through rational positive-discriminant division, trig-substitution radicals, scalar/additive retries, target-free polynomial routes, hyperbolic/direct primitives, and related route metadata.
- Extracted integration helper files to keep file-size ratchets green: linear combination fallback, scalar-multiple retry, retry detail builders, and trig-power normalization.
- Playwright verified ordinary V2 answers, boundary errors, facts/details, Trust, Copy Result, To Editor, History replay, and readability for representative affected integration routes.

## Completed Gate 4

- Migrated existing named special-function and elliptic indefinite-integration successes to typed V4 authority when the expression uses approved non-standard functions.
- Added the live `indefiniteIntegral:special-function` selector while keeping ordinary successes and controlled errors on Calculus-owned V2.
- Typed V4 now carries `li`, `Ei`, `Si`, and `erfi` special-function expressions with producer-proven standard MathJSON leaves and conditions; `Erf` and Fresnel outputs remain standard V2.
- V4 rendering preserves route-owned affine readback such as `2x+1` without recovering meaning from rendered LaTeX.
- Playwright verified special V4 output, standard V2 special-family output, Copy Result, To Editor, History replay, cards, and readability; representative authority inventory found no V1 indefinite outcomes.

## Completed Gate 5

- Added a backend-only cubic Hermite preconditioner for exact squarefree cubic curves `y^2=P(x)`.
- The reducer rewrites polynomial-over-radical differentials into an exact correction `Q(x)y` plus residual basis `dx/y` and `x dx/y`, ready for the live second-kind route.
- Repeated-root cubic inputs remain delegated to the existing genus-0 degeneration fallback instead of widening this gate.
- The selected radical product normalization is branch-gated: `sqrt(x^3)sqrt(x^2+1)` normalizes only with displayed real-branch facts.
- No app-visible result changes in this gate; adoption and Playwright output verification move to the live second-kind gate.

## Completed Gate 6

- Added the live genus-1 cubic Hermite adoption slice for reductions whose residual is first-kind.
- The selected `sqrt(x^3)sqrt(x^2+1)` regression now returns a typed V4 correction-plus-`EllipticF` expression with structural `+C`, branch facts `x\ge0` and `x^2+1>0`, and verified standard MathJSON leaves.
- True second-kind residuals remain controlled boundaries with visible genus-1 preconditioner and live-boundary detail cards.
- Visual verification confirmed the success and boundary outputs in the real app; Playwright required sandbox escalation for Chromium and reused the local Vite server.
