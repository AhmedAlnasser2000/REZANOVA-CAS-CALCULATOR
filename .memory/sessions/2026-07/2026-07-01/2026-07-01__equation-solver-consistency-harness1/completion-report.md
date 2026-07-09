# Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

- Milestone: `EQUATION-SOLVER-CONSISTENCY-HARNESS1`.
- Gate label: backend.
- User-approved scope: exact/numeric route consistency and repeated-root interval dedupe only; no new numeric algorithms, public result schema, Copy Result, History, OOE, Tauri, app-state, or persisted schema changes.

## Changes

- Added a route-consistency harness comparing exact/numeric fallback output against explicit Numeric Interval runs for finite exact roots, high-degree numeric fallback, exact no-solution abs cases, rational pole validation, discontinuity-heavy nonlinear examples, periodic interval roots, and repeated roots.
- Clustered repeated-root interval candidates after validation using a tolerance derived from the selected interval cell width so roots such as `(x-1)^3(x+2)^2=0` collapse to one representative root per repeated factor.
- Closed abs-route bypasses discovered by the harness:
  - targeted absolute-value equations no longer route through pre-shared special-form or bounded polynomial-carrier shortcuts before corrected abs branch semantics;
  - exact negative abs comparisons stop as no-real-solution cases;
  - exact-zero abs comparisons emit a single branch.

## Boundaries

- Numeric fact taxonomy remains deferred to `EQUATION-NUMERIC-FACT-TAXONOMY-POLISH1`.
- Main Display and Formula Viewer trust wording remains deferred to `EQUATION-RESULT-TRUST-READBACK-POLISH1`.
- Unrelated staged/dirty transcendental RDE work was left untouched.
