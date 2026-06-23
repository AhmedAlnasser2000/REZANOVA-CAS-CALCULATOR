# SYMBOLIC-ELIMINATION-CONSUMER-READINESS0

Date: 2026-06-23

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live repo inspection

## Gate

- Gate type: backend
- Scope: readiness audit only; no source implementation.

## Finding

The private elimination primitive should stay with one production consumer for now: Equation Polynomial 2x2 systems.

That consumer is safe because it already matches the primitive contract:

- callers provide two zero-form bivariate equations;
- retained and eliminated variables are explicit;
- Algebra remains owner of exact resultant arithmetic;
- Equation keeps candidate-pair solving, validation, stored-value readback, error wording, detail sections, and `DisplayOutcome` shape.

## Why No Second Consumer Yet

No current second lane is a clean parity migration:

- Carrier elimination is structurally related, but it also owns explicit carrier detection, reversibility, branch facts, and back-substitution semantics. Moving it now would risk hiding solver judgment inside an elimination helper.
- Polynomial-system widening beyond 2x2 would be new product behavior, not consumer parity.
- Higher-dimensional resultant planning needs a dedicated algorithm and cap policy, not a facade swap.
- Single-equation auxiliary-variable inference remains out of scope; it would be a solver frontier decision rather than primitive consumer parity.

## Future Candidates

Promote another elimination consumer only when a milestone proves the fit:

- carrier-elimination primitive extension for explicit algebraic carriers after substitution/facts/readback parity is clear;
- polynomial-system parity if another bounded system route already exists and needs the same resultant bridge;
- higher-dimensional resultant planning after a product requirement and cap/readback policy exist.

## Decision

Elimination remains parity-gated and product-pressure-driven. Do not add an app-wide primitive-surveillance validator or a second elimination consumer until there is a concrete repeated mechanic and focused parity tests.

## Verification Plan

- `npm run test:memory-protocol`
- `git diff --check`
