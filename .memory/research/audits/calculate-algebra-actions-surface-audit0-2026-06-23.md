# CALCULATE-ALGEBRA-ACTIONS-SURFACE-AUDIT0

Date: 2026-06-23

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

Backend documentation and product-boundary audit only.

This audit records the boundary between Calculate's user-facing algebra soft-key actions and the private Symbolic Primitives now established under `src/lib/symbolic-engine/primitives/`.

## Current Surface

Calculate exposes these visible algebra actions in its soft-key row:

- `Simplify`
- `Factor`
- `Expand`

Those actions are public product commands. They are not automatically equivalent to the private primitive APIs with similar names.

## Boundary

Calculate owns:

- soft-key action routing;
- user-facing labels and guide wording;
- action IDs and command semantics;
- result presentation expectations;
- broad command behavior for quickform evaluation.

Symbolic Primitives own:

- bounded reusable mechanics;
- internal MathJSON transformations;
- consumer-specific parity evidence;
- failure metadata for internal callers.

During Symbolic Primitive consumer parity, do not silently swap Calculate buttons to private primitives. A future explicit Calculate bridge/audit must decide whether a visible Calculate action can consume a primitive, and it must prove output parity with focused UI/runtime tests.

## Future Path

Potential later milestone:

```text
CALCULATE-ALGEBRA-ACTIONS-PRIMITIVE-BRIDGE1
```

That milestone would audit current Calculate action behavior, decide which primitive mechanics are safe to consume, and add visible-output parity tests before any bridge lands.

## Verification

- `npm run test:memory-protocol` pending with the full consumer-parity run.
- `git diff --check` pending with the full consumer-parity run.

