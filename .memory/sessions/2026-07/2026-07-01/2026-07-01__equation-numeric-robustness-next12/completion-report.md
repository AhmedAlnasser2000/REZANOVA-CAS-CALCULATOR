# Equation Numeric Robustness Next 12

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Completed Gates

- `EQUATION-REAL-POLYNOMIAL-STURM-CERTIFICATION1`: added a numeric Sturm-sequence certification layer for real polynomial fallback. Aberth-Ehrlich remains the approximation engine; Sturm now counts and isolates distinct real roots and the deterministic algebraic fallback reports certification evidence when accepted roots validate against certified intervals.
- `EQUATION-REAL-INTERVAL-ARITHMETIC-DOMAIN1`: added an internal real interval-arithmetic domain substrate and threaded its safe/invalid/split-required/unknown evidence into numeric segmentation details. Explicit Numeric Interval and bounded auto-search continue to use the existing segmentation route; symbolic-only cases are left on symbolic facts.
- `EQUATION-NUMERIC-PRECISION-ESCALATION1`: promoted the decimal.js validation helper into an internal precision engine seam. Risk-triggered polynomial diagnostics now name the decimal.js backend, keep 80-digit residual checks, and report decimal root-polish evidence without adding MPFR/WASM or widening solve routes.
- `EQUATION-REAL-PIECEWISE-ABS-HYBRID1`: added a real numeric piecewise fallback for contained `abs`/`min`/`max` carriers after exact symbolic routes miss. The route rewrites capped branches, solves generated polynomial/rational branch equations numerically, validates candidates against the original equation, and adds piecewise breakpoint evidence to Numeric Interval segmentation.
- `EQUATION-REAL-INTERVAL-NEWTON-PRUNING1`: added conservative interval-Newton-style pruning evidence to the shared real interval/search substrate. Manual Numeric Interval and bounded auto-search now count finite derivative-safe cells pruned before adaptive refinement while keeping ITP as the final bracket refiner and local-minimum recovery for tangent roots.
- `EQUATION-NUMERIC-CONFIDENCE-READBACK1`: added route-specific numeric confidence detail cards across deterministic real polynomial/rational fallback, explicit interval solving, bounded nonlinear search, piecewise numeric branches, periodic interval guidance, and existing Complex numeric polynomial output. The labels stay in detail sections and do not add public result schema.
- `EQUATION-COMPLEX-BRANCH-CUT-POLICY1`: added an internal Complex principal-branch policy helper for future nonlinear numeric solving. It detects principal log, principal root, fractional-power, and inverse-trig branch-sensitive nodes, records exact constant branch-cut contact, and marks simple direct-target rectangular regions unsafe when they cross principal cuts or branch points. No visible solver route was widened.
- `EQUATION-COMPLEX-NUMERIC-EVALUATOR1`: added a dedicated internal Complex numeric evaluator contract. It evaluates target-aware complex zero forms, reports finite/undefined/overflow/unsupported status, residual norm, evaluation count, unresolved-symbol diagnostics, and principal branch-cut/domain diagnostics for log, roots, fractional powers, trig, and inverse trig. It remains internal/test-facing and does not enable visible Complex nonlinear solving.
- `EQUATION-COMPLEX-POLYNOMIAL-CONDITIONING-LIFT1`: hardened visible Complex polynomial/rational numeric fallback diagnostics while keeping Aberth-Ehrlich as the maintained polynomial engine. Shared polynomial diagnostics now carry numeric multiplicity estimates from dedupe groups, Complex readback reports repeated/cluster evidence, decimal.js revalidation, and large-degree display guidance, and rectangular/polar/cis output remains honored.
- `EQUATION-COMPLEX-SEED-GRID-NEWTON1`: added an internal Complex nonlinear candidate generator for bounded rectangular regions. It uses deterministic seed-grid damped Newton with a trust-region step cap, validates candidates through the dedicated Complex evaluator, dedupes by complex distance and residual, and supports capped reproducible supplemental random seeds without enabling visible Complex nonlinear solving.

## Pending Gates

- `EQUATION-COMPLEX-CONTOUR-WINDING-VERIFICATION1`
- `EQUATION-COMPLEX-REGION-NONLINEAR-SOLVE1`

## Memory Note

- Shared durable memory files were already dirty from unrelated transcendental/Risch work at this checkpoint. This session dossier records the Equation numeric milestone evidence; shared `current-state`, journal, and decisions files were intentionally left untouched to avoid mixing lanes.
- The branch-cut policy checkpoint also left shared `.memory/journal/2026-07/2026-07-01.md` untouched because it was already dirty from another lane; the active session dossier carries this milestone's durable evidence instead.
