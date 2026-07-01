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

## Pending Gates

- `EQUATION-NUMERIC-PRECISION-ESCALATION1`
- `EQUATION-REAL-PIECEWISE-ABS-HYBRID1`
- `EQUATION-REAL-INTERVAL-NEWTON-PRUNING1`
- `EQUATION-NUMERIC-CONFIDENCE-READBACK1`
- `EQUATION-COMPLEX-BRANCH-CUT-POLICY1`
- `EQUATION-COMPLEX-NUMERIC-EVALUATOR1`
- `EQUATION-COMPLEX-POLYNOMIAL-CONDITIONING-LIFT1`
- `EQUATION-COMPLEX-SEED-GRID-NEWTON1`
- `EQUATION-COMPLEX-CONTOUR-WINDING-VERIFICATION1`
- `EQUATION-COMPLEX-REGION-NONLINEAR-SOLVE1`

## Memory Note

- Shared durable memory files were already dirty from unrelated work at this checkpoint. This session dossier records the milestone evidence for `EQUATION-REAL-POLYNOMIAL-STURM-CERTIFICATION1`; shared `current-state`, journal, and decisions files were intentionally left untouched to avoid mixing lanes.
