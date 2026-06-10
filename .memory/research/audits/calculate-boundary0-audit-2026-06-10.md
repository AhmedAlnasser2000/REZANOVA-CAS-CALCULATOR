# CALCULATE-BOUNDARY0: Quickform Boundary Audit

Date: 2026-06-10
Agent: codex
Model: gpt-5.5
Status: audit complete

## Summary

`CALCULATE-BOUNDARY0` clarifies Calculate as Calcwiz's quickform evaluator, not as a guided owner of every math topic. Shared math cores remain reusable capabilities that any workspace may call. The boundary problem is product-surface ownership: Calculate should give fast one-shot answers and compact transformations, while richer guided workflows belong in their topic workspaces.

This is an audit and decision pass only. No solver behavior, UI routing, OOE runtime shell, launch-ticket, result schema, history schema, or Rust behavior changes are included.

## Locked Boundary

- Calculate owns fast one-shot evaluation and transformation.
- Calculate may call algebra, simplification, calculus, trig, log/exp, numeric, domain, and readback capabilities when the user typed a direct expression.
- Calculate may show essential validity facts, such as denominator exclusions after simplification.
- Calculate should stay compact: answer first, minimal validity, and optional handoff when the user needs a guided workflow.
- Calculate must not become the guided workspace for derivatives, integrals, limits, periodic families, proof trees, composition analysis, method selection, or step-by-step solving.
- Future step-by-step support should be a reusable capability. Calculate may expose a compact handoff to it, but the topic workspaces should own rich step experiences.

## Current Evidence

### Healthy Calculate Surface

The standard Calculate path already mostly fits the desired role:

- `src/lib/modes/calculate.ts` evaluates broad expression input through shared expression, algebra, calculus, and numeric helpers.
- Standard Calculate can compactly recognize derivatives, integrals, limits, ordinary expressions, and algebraic transforms.
- Top-level equations and inequalities already route away from Calculate with guidance, preserving Equation as the relation/constraint owner.
- Stored-variable substitution and domain details are handled as compact result facts rather than guided workflow state.

### Boundary Mismatch

Calculate still contains visible guided calculus/workbench remnants:

- `src/lib/modes/calculate-navigation.ts` exposes a `calculusHome` menu inside Calculate.
- `derivativesHome`, `derivative`, `derivativePoint`, `integral`, and `limit` remain Calculate workbench screens.
- Some Calculate calculus menu entries route into the legacy `advancedCalculus`/unified Calculus workspace, while others remain Calculate-owned.
- `src/app/logic/runtimeControllers.ts` still has `runCalculateWorkbenchAction` using coarse `calculate.workbench` OOE provenance for nonstandard Calculate screens.

This creates the same product-role ambiguity that previously existed between Calculus and Advanced Calc. Now that Calculus is unified, guided calculus controls should not remain a visible Calculate branch.

## Product Ownership Map

### Calculate

Keep:

- One-shot expression evaluation.
- Simplify, factor, expand, and direct algebra transforms.
- Compact direct calculus expression evaluation when typed naturally.
- Compact trig/log/exponential/unit-value evaluation.
- Compact domain/validity readback for transformations.
- Handoff notes when the expression deserves a guided workspace.

Avoid:

- Dedicated calculus menus.
- Long calculus method panels.
- Periodic/composition proof trees.
- Step-by-step derivation ownership.
- General equation or inequality solving.
- Topic-workbench navigation hidden under Calculate.

### Equation

Owns relations and constraints:

- Equations, inequalities, roots, candidates, validity, domains, selected targets, and relation-specific provenance.
- Future equations containing calculus/trig/sum notation should consume reusable cores rather than forcing those expressions into Calculate or Calculus first.

### Calculus

Owns guided calculus:

- Derivative, derivative-at-point, integral, limit, series, ODE, partials, assumptions, method selection, validation, and future step-rich calculus flows.

### Trigonometry

Owns guided trig understanding:

- Identities, triangles, angle conversion, period/phase, and Guide-backed unit-circle reference.
- General solving stays in Equation; quick trig values stay in Calculate.

## OOE Implication

Do not migrate Calculate to the runtime-shell + launch-ticket model until the surface boundary is cleaned. OOE should not harden a blurry product role.

The safe sequence is:

1. `CALCULATE-SURFACE1`
   - Remove visible guided Calculus menus from Calculate.
   - Keep direct typed calculus expressions in standard Calculate as compact quickform evaluation.
   - Replace any needed guided affordance with an explicit handoff to Calculus.

2. `CALCULATE-RESTRICTIONS1`
   - Strengthen compact validity readback for expression transforms.
   - Example: simplifying `(x^2-1)(x+1)/(x-1)` may return `(x+1)^2` with `x != 1` in `Valid when`.
   - Keep this as compact correctness, not a guided proof surface.

3. `CALCULATE-RUNTIME-SHELL1`
   - Add worker runtime shell and launch tickets only after the visible Calculate request contract is clean.
   - Start with standard quickform evaluation and algebra transforms.
   - Defer or remove Calculate workbench routes rather than workerizing them as a permanent product branch.

4. `STEP-ENGINE0`
   - Later, design step-by-step as a reusable capability and display contract.
   - Calculate may link to or request compact steps, but it should not become the universal step workspace.

## Non-Goals

- No Calculate runtime-shell migration.
- No launch tickets.
- No guided calculus deletion in this audit pass.
- No solver capability changes.
- No step-by-step engine.
- No OOE scheduler change.
- No history/result schema change.
- No Rust solver execution.

## Acceptance For This Audit

- Calculate is documented as the quickform evaluator.
- Guided calculus remnants are identified as the main cleanup target.
- The next safe implementation milestone is `CALCULATE-SURFACE1`, not immediate OOE widening.
- The reusable-core principle remains intact: math truth lives in shared capabilities, while workspaces own experiences.
