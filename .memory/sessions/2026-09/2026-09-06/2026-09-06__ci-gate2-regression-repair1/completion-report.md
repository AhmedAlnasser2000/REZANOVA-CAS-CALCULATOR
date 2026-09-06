# CI-GATE2-REGRESSION-REPAIR1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gates

- Backend regression repair: verified.
- Seam-impact coverage repair: verified.
- Real-app output: verified.
- Selective commit: explicitly approved by the user on 2026-09-06.

## Completed Scope

- Finite-root presentation simplifies native roots before deciding whether closed exact arithmetic may evaluate, while the early polynomial compatibility readback retains its established `-4/2, 4/2` spelling.
- Polynomial-carrier formula scaffolding now yields matching simplified visible roots and producer-owned MathJSON; clean existing branch order and validation semantics remain unchanged.
- Deterministic formal comparison normalizes bounded exact `Complex(real, imaginary)` nodes and continues to forbid Compute Engine equality from overriding a formal mismatch.
- Periodic carrier output restores readable `2\pi k` spelling without changing branch semantics.
- Graph wall-clock-sensitive evidence uses a controlled clock, with a separate production time-budget exit test; expensive mixed-trig cases run independently with unchanged timeout policy.
- Canonical-result and Equation finite-root changes select feature probes, History replay, workspace runtime contracts, and the existing result-contract gates.
- Four pre-existing Equation unused-binding lint errors were removed without changing runtime values.

## Boundary

- No solver redesign, timeout increase, public schema change, frozen V1 edit, proof-baseline update, or request-wide cache was introduced.
- Node 24/Actions and v0.3.0 release preparation remain outside this commit.
- No push or tag is authorized.
