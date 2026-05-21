# CALC-CORE2 Dependency Matrix

Date: 2026-04-24

Status: complete foundation gate; no new calculus capability was added.

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

`CALC-CORE2` records the dependency-readiness rule for post-`CALC-CORE1` calculus work. The stable app now has an internal derivative backcheck boundary and internal integration strategy labels for existing symbolic wins. These are planning and verification metadata only; they do not change visible result origins, UI badges, or supported antiderivative families.

## Dependency Matrix

| Future milestone | Calculus surface | Required substrates | Readiness | Decision |
| --- | --- | --- | --- | --- |
| `CALC-COMP1` | Bounded substitution/composition antiderivatives | derivative backcheck, carrier recognition, proportional derivative-factor check, exact/numeric-confidence verification, stable result origin | ready-with-adapter | May proceed narrowly for derivative-backed substitution families; stop if a candidate needs broader equivalence or new algebra recognition. |
| `CALC-COMP2` | Chain-rule derivative readback | symbolic differentiation, formatter/readback polish, domain-sensitive abs/radical wording | ready-with-adapter | Can follow after `CALC-COMP1`; focus on readability, not new derivative semantics. |
| `CALC-LIM1` | Composition-aware limits and domains | finite/infinite limit helpers, bounded factor/cancel support, branch/domain awareness, result guard | ready-with-adapter | May proceed only on already-supported bounded algebra families; no general asymptotic engine. |
| `CALC-INT1` | Definite integral trust | accepted antiderivatives, endpoint/domain checks, numeric fallback guard, discontinuity warnings | blocked | Wait until accepted antiderivative families and domain checks are stronger. |
| `CALC-PARTS1` | Integration by parts strategy hardening | strategy metadata, derivative backchecks, LIATE factor choice, stop policy, readback | defer | Existing by-parts families are labeled internally, but broad strategy hardening should wait until substitution/readback foundations settle. |
| `CALC-RAT1` | Partial fractions/rational integration | polynomial factorization, denominator-domain tracking, partial fraction decomposition, equivalence checks | blocked | Do not start inside calculus; requires an explicit algebra prerequisite. |
| `CALC-RAD-INT1` | Rationalizing/trig substitution for radicals | radical normalization, rationalizing substitution policy, branch/domain tracking, inverse-domain readback | blocked | Keep out of stable calculus until a dedicated algebra/radical prerequisite exists. |

## CORE2 Findings

- Derivative backchecks are now available as an internal boundary with exact normalized comparison first and numeric spot-check confidence second.
- Numeric-confidence verification is explicitly not treated as proof.
- Existing symbolic integration wins now carry internal strategy labels:
  - `direct-rule`
  - `inverse-trig`
  - `derivative-ratio`
  - `u-substitution`
  - `integration-by-parts`
  - `affine-linear`
  - `compute-engine`
- `ResultOrigin` and `DisplayOutcome` remain unchanged.
- `CALC-COMP1` should proceed only as a narrow substitution/composition milestone. It should not absorb by-parts, rationalization, partial fractions, or broader integration strategy work.

## Verification

- Focused calculus/symbolic unit gate: passed on 2026-04-24.
- Browser smoke: passed on 2026-04-24.
- Production build: passed on 2026-04-24.
- Lint: passed on 2026-04-24.
- Memory protocol: passed on 2026-04-24.
