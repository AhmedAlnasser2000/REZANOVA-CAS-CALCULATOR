# SYMBOLIC-PRIMITIVES-PARITY-CLOSEOUT0

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Calcwiz is done enough with the first Symbolic Primitives establishment and consumer-parity wave to pause this lane and resume other product/solver lanes.

The five private primitives exist under `src/lib/symbolic-engine/primitives/`:

- expansion;
- substitution;
- factorization;
- simplification;
- elimination.

Each has at least one proven production consumer. Expansion, substitution, factorization, and simplification now also have one follow-up parity consumer where repo evidence showed repeated mechanics. Elimination remains intentionally narrow with Polynomial 2x2 as the only safe production consumer.

## Closeout Finding

No broad deduplication sweep should run now.

Remaining local helpers fall into three classes:

1. Legitimate local ownership:
   - Algebra exact-rational polynomial/rational/radical domains;
   - Equation answer-mode, branch/fact/readback, candidate-validation, and route-order logic;
   - Calculate public `Simplify`, `Factor`, and `Expand` actions;
   - inequality, complex, variable-memory, and guarded-transform semantics.
2. Future parity candidates:
   - Equation isolation/guarded MathJSON helpers;
   - `symbolic-engine/mixed-factor`;
   - derivative simplification;
   - polynomial-system validation substitution;
   - future Calculate primitive bridges, with visible-output parity tests.
3. Deferred governance tooling:
   - no hard app-wide primitive-surveillance validator yet;
   - milestone plans should continue declaring primitive use or the reason local logic remains route-owned.

## Current Boundary

Private Symbolic Primitives own reusable bounded mechanics only.

They do not own:

- user-facing Calculate action semantics;
- Equation route judgment;
- final-answer readback polish;
- Algebra exact-domain arithmetic;
- OOE/runtime/app-state/UI behavior.

## Recommended Next Lanes

The primitives lane may pause after this closeout.

Good next lanes:

- final-answer/readback polish, especially redundant `0 +`, awkward `ii`, and noisy branch expressions;
- Equation frontier algorithms that now have a primitive substrate;
- Calculate bridge audit only when the user-facing action surfaces need parity work;
- Graphing or other product lanes only after their solver/readback prerequisites are clear.

## Verification

- Audit-only milestone.
- Expected verification:
  - `npm run test:memory-protocol`
  - `git diff --check`

