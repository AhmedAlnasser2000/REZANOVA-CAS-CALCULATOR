# Calculus Differentiation Roadmap

Status: draft roadmap

Purpose: define the intended differentiation track before adding more derivative features. This roadmap is intentionally provisional: milestone names, caps, and sequencing may be refined after implementation audits expose better boundaries.

This document is planning only. It does not change solver behavior, Display behavior, OOE/runtime policy, History, schemas, stored values, worker host identity, or public result contracts.

## Why This Track Comes First

Differentiation is the safest next Calculus family to stabilize before Limits and ODE because the core symbolic rules already exist and because the current user experience is visibly inconsistent.

Current pain points:

- Derivative and derivative-at-point screens still edit through lower workspace math fields instead of the main editor.
- The generated derivative preview competes with the actual Display result, which can make the answer feel duplicated.
- Derivative routing delegates through the Calculate derivative path, so the guided Calculus workspace does not yet own enough route evidence or cost control.
- Some derivative cases can take longer than expected because the derivative path has no dedicated preflight/cost classifier comparable to the recent Equation and Integration control work.
- Partial derivatives exist, but only as first-order `x`, `y`, or `z` requests.

## End State

By the end of this roadmap, Calcwiz should have a stable undergraduate differentiation surface:

- Derivative, derivative-at-point, and partial derivative tools edit their main expression through the main editor.
- The guided workspace shows controls, options, and generated request previews only where they help; it does not duplicate the answer.
- Display presents one authoritative derivative result with clear strategy badges and readable detail sections.
- Differentiation has a bounded route preflight layer that can say whether a request is direct-symbolic, supported but costly, Compute Engine fallback, unsupported, or too complex.
- Slow or unsupported derivative cases stop with controlled messages instead of wandering.
- Higher-order ordinary derivatives are supported for finite, capped order.
- Higher-order and mixed partial derivatives are supported for finite variable sequences.
- Gradient, Hessian, Jacobian, divergence, curl, and Laplacian are available as organized applications of partial derivatives.
- Derivative-at-point is treated as "differentiate first, then evaluate/substitute" with clear exact or approximate status.
- Educational readback explains the rule family used without pretending to be a full proof assistant.

## Scope Principles

- Keep Calculus as the guided workspace owner for derivative workflows.
- Keep Symbolic Engine as the shared symbolic differentiation implementation layer.
- Keep Calculate as the compact quickform user surface; do not force guided Calculus UX constraints back into Calculate.
- Keep OOE as launch/host/commit/drop traffic control only.
- Do not broaden Equation solver ownership while implementing ordinary differentiation features.
- Add feature depth only after UX source ownership and route control are stable.
- Treat this roadmap as a finite-coursework roadmap, not an advanced analysis roadmap.

## Finite Order Policy

Differentiation requests must be finite.

Planned policy:

- Ordinary derivatives may repeat `d/dx` up to an agreed cap.
- Mixed partial derivatives may use an ordered finite sequence of variables, such as `x,x,y` for `partial^3 f / partial x^2 partial y`.
- The UI should not expose "infinitely many variables" or infinite-order derivatives.
- The first implementation cap should be conservative and easy to explain to students.
- If a user exceeds the cap, the app should return a controlled "order too high" message instead of attempting an unbounded computation.

This keeps the roadmap aligned with standard Calculus and early multivariable coursework. Frechet derivatives, functional derivatives, variational calculus, PDE systems, and infinite-dimensional differentiation remain out of scope.

## Milestone Sequence

### `CALCULUS-DERIVATIVE-UX-AUDIT0`

Type: docs/readiness

Goal: record the exact current ownership of derivative editing, preview display, result display, focus routing, soft actions, and Calculate delegation before changing behavior.

Expected outcome:

- Map the derivative and derivative-at-point UI against the already-shipped integral main-editor pattern.
- Identify which duplicated result surfaces should stay, move, or disappear.
- Identify any dirty cross-agent files before implementation begins.
- Decide whether derivative and derivative-at-point can share one editor-source helper with integral/laplace, or whether they need a small derivative-specific adapter first.

### `CALCULUS-DERIVATIVE-EDITOR-SOURCE1`

Type: ui

Goal: make derivative and derivative-at-point expressions use the main editor as the source of truth.

Expected outcome:

- The lower "Derivative Body" math field disappears from the guided Calculus derivative screen.
- The lower derivative-at-point body math field disappears, while the numeric point remains an ordinary control.
- F2/To Editor semantics match the integral screens: focus the main editor when the main editor is already the body source.
- Generated derivative previews become read-only request previews, not a second editing surface.
- The main editor keeps the raw body expression, while generated request LaTeX remains derived state.

### `CALCULUS-DERIVATIVE-SINGLE-RESULT1`

Type: ui

Goal: make derivative output have one authoritative answer presentation.

Expected outcome:

- The Display result card is the answer owner.
- The top editor/request area shows the request or body context, not a second answer.
- Copy Result and Copy Expr remain distinct.
- The screen no longer visually suggests that two different derivative answers were produced.

### `SYMBOLIC-DIFFERENTIATION-PREFLIGHT1`

Type: backend

Goal: add a dedicated derivative route preflight before widening differentiation features.

Expected outcome:

- A derivative request receives bounded route classification before solving.
- Classification distinguishes direct symbolic coverage, known unsupported forms, allowed Compute Engine fallback, over-budget forms, and malformed derivative requests.
- The classifier records route evidence that can appear in details or tests without changing public schemas prematurely.
- The symbolic differentiator keeps its existing rule metadata, but unsupported or over-budget paths stop earlier and more clearly.
- Known slow cases become a maintained corpus for future implementation slices.

### `SYMBOLIC-DIFFERENTIATION-COST-GUARD1`

Type: backend

Goal: prevent runaway derivative work and keep fallback behavior predictable.

Expected outcome:

- Recursive derivative traversal has a cost budget based on node count, depth, repeated product expansion, and fallback risk.
- Compute Engine fallback is gated, not automatic for every unknown head.
- Over-budget output gets a controlled educational message.
- Small direct-rule derivatives still feel instant.
- The route evidence can explain why a result was direct, fallback, unsupported, or stopped.

### `CALCULUS-HIGHER-DERIVATIVES1`

Type: backend/ui

Goal: support finite higher-order ordinary derivatives.

Expected outcome:

- Users can request `d^2/dx^2`, `d^3/dx^3`, and capped `d^n/dx^n`.
- Implementation applies the existing derivative engine repeatedly under the route/cost budget.
- The result records the requested order and the effective variable.
- Derivative-at-point can evaluate a higher-order derivative at a point after differentiating.
- Over-cap or over-budget higher-order requests stop cleanly.

### `CALCULUS-PARTIALS-ORDERED-SEQUENCE1`

Type: backend/ui

Goal: upgrade partial derivatives from first-order `x/y/z` only to finite higher-order and mixed partials.

Expected outcome:

- Partial derivative requests carry an ordered finite variable sequence.
- Supported examples include `partial^2 f / partial x^2`, `partial^2 f / partial x partial y`, and `partial^3 f / partial x partial y partial x`.
- The UI keeps the variable sequence understandable instead of asking students to type raw advanced notation first.
- The engine applies ordinary differentiation repeatedly with the selected variable at each step.
- Mixed partial output preserves the requested order, even when the mathematical result is symmetric for nice functions.

### `CALCULUS-DERIVATIVE-MATRIX-OPERATORS1`

Type: backend/ui

Goal: organize common multivariable derivative outputs as matrices and vectors.

Expected outcome:

- Gradient for scalar functions.
- Hessian for scalar functions.
- Jacobian for vector functions.
- Laplacian for scalar functions.
- Divergence and curl for vector fields.
- Output is structured and readable, not just a flattened list of formulas.

### `CALCULUS-DERIVATIVE-READBACK1`

Type: ui/backend

Goal: make differentiation results educational without overpromising full derivations.

Expected outcome:

- Strategy badges and details identify rule families such as direct rule, chain rule, product rule, quotient rule, function power, general power, inverse trig, inverse hyperbolic, higher order, and mixed partial.
- Readback can show the input body, derivative variable/order, and final simplified result.
- The explanation stays compact for routine cases.
- For unsupported cases, the message names the nearest boundary rather than saying only "failed."

### `CALCULUS-IMPLICIT-DIFFERENTIATION-READINESS0`

Type: docs/readiness

Goal: decide whether implicit differentiation is ready to enter implementation.

Expected outcome:

- Document the exact Equation solver dependency needed to solve for `dy/dx`.
- Confirm how `y` as a function of `x` is represented.
- Confirm how branch conditions and denominator exclusions should display.
- Stop if Equation ownership is still actively changing or if the result would need route-local mini-solver logic.

Implicit differentiation should not be the first expansion slice because it crosses the Equation solver boundary.

## Deferred From This Roadmap

- Infinite-order differentiation.
- Infinite-dimensional derivatives.
- Frechet, Gateaux, functional, or variational derivatives.
- PDE solving.
- Broad CAS simplification after every derivative.
- Automatic proof of equality between all mixed partial orders.
- Implicit differentiation implementation before the readiness milestone.
- Any change to OOE capability identity, worker host identity, History schema, or persisted result schema unless a later approved milestone explicitly requires it.

## Refinement Rules

This roadmap may be updated when implementation reveals a better boundary.

Acceptable refinements:

- Split a milestone if it touches too many files.
- Rename a milestone if the repo already has a clearer naming convention.
- Lower or raise derivative order caps after cost evidence exists.
- Move a feature later if it crosses Equation, Display, History, or OOE boundaries more than expected.
- Promote a deferred item only after its prerequisites are explicit.

Do not silently widen scope during an implementation slice. If a feature needs new representation, facts/assumptions, validation, route evidence, readback, or tests, record that prerequisite before implementing the feature.
