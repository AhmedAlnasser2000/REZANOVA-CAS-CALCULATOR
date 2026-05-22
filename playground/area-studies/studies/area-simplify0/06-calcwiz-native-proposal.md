# AREA-SIMPLIFY0 Calcwiz-Native Proposal

## Proposal

Plan `SIMPLIFY-CORE0` as a small policy substrate before `INT-RAT2`.

Goal:

> give Calcwiz a shared vocabulary for normal forms, readable forms, equivalence trust, and preserved constraints without adding new simplification behavior.

## Stable Owner

Likely owner: a new small algebra/display policy module, with evidence from:

- `src/lib/algebra/rational-function-core.ts`
- `src/lib/algebra/domain-range-core.ts`
- `src/lib/display/*`
- current symbolic-engine family modules

Existing modules should keep their current transform ownership.

## Playground Path

No Playground runner is required for `SIMPLIFY-CORE0`.

If form-choice uncertainty becomes high, add a Playground-only corpus inspector that compares candidate forms over shipped examples and source-inspired challenge families. It must not execute source mirrors or change product behavior.

## Acceptance Criteria

For `SIMPLIFY-CORE0`:

- Define a small form-intent vocabulary.
- Record canonical/check/readable forms without rewriting shipped behavior.
- Preserve denominator/domain constraints as structured policy facts.
- Classify equivalent-form trust as proven, assumed, display-only, or blocked.
- Add tests proving shipped simplify/factor/expand/calculus behavior does not change.
- Update `INT-RAT2` readiness notes to consume the policy later.

## Non-Goals

- No new simplification rules.
- No global expression canonicalizer.
- No new calculus or equation behavior.
- No UI redesign.
- No source-mirror execution or copied code.
- No assumption engine or branch-cut theorem prover.
