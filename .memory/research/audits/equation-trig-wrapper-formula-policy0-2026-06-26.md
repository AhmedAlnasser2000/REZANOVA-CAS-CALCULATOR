# EQUATION-TRIG-WRAPPER-FORMULA-POLICY0

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

This audit keeps trig wrapper formula handoff non-live for now and defines the prerequisites for a later `EQUATION-TRIG-WRAPPER-FORMULA1` implementation.

The live repo already has two relevant foundations:

- Composition can invert one-layer `sin(F)=rhs`, `cos(F)=rhs`, and `tan(F)=rhs` into generated branch equations with range facts, angle-unit-aware inverse trig readback, and integer family facts.
- Generated formula payloads can carry Real Cardano/Ferrari `caseMath`, scoped facts, wrapper validation evidence, and grouped readback without flattening formula cases into raw `exactLatex`.

The missing piece is not Cardano/Ferrari itself. It is a trig-specific validation and readback policy for periodic generated branches.

## Current Repo Evidence

- `src/lib/equation/composition/core.ts` generates trig composition branches:
  - `sin(F)=b` -> `F=arcsin(b)+2*pi*n` and `F=pi-arcsin(b)+2*pi*n`, plus `-1<=b<=1` and `n in Z`.
  - `cos(F)=b` -> two periodic branch equations, plus `-1<=b<=1` and `n in Z`.
  - `tan(F)=b` -> one periodic branch equation, plus `n in Z`.
- `src/lib/equation/parameterized/composition.ts` already solves generated composition branches through linear, polynomial, rational, factorable, algebraic-isolation, carrier, exp-log, and trig families.
- Generated Cardano/Ferrari formula families are opt-in only. Composition currently passes formula handoff only for algebraic wrapper kinds: square-root, absolute-value, square-power, odd-power, even-power, and nth-root.
- `src/lib/equation/parameterized/generated-formula-validation.ts` blocks formula payloads unless the consumer proves wrapper back-substitution validation, candidate validation, caseMath preservation, and scoped-fact preservation.
- `FORMULA-PRESENTATION-PIPELINE2` makes heavy formula case output compact-first, so trig formula output has a viable Display path once the route is made live.

## Policy Decision

Do not enable trig formula handoff yet.

A future live trig formula route must be Real Exact, one-layer, and opt-in from trig/composition only. It must not add formula families to default generated handoff route order.

The first live route may cover one-layer `sin`, `cos`, and `tan` together if implementation proves all branch-local facts are preserved. If endpoint dedupe or two-branch sine/cosine evidence becomes unstable, the safe fallback first slice is `tan(F(target))=rhs` only because tangent has one periodic branch family and no `[-1,1]` range split.

## Required Semantics For A Live Trig Formula Route

### One-Layer Shape

Allowed future shapes:

- `sin(F(target))=rhs`
- `cos(F(target))=rhs`
- `tan(F(target))=rhs`

Where:

- `F(target)` may generate a direct or safely rational-cleared degree-3 or degree-4 selected-target equation.
- `rhs` must be target-free.
- Equation mode must be Real Exact.
- Numeric interval routing must not be active.

Deferred:

- Complex trig formula wrappers.
- Nested trig/composition formula handoff.
- Mixed/additive trig equations such as `sin(F)+F=rhs`.
- Target-bearing RHS.
- Target-in-base or inverse-trig wrapper expansions not already owned by existing guarded periodic systems.
- Broad generated route order widening.

### Periodic Parameter Facts

Generated formula answers must preserve integer parameter facts as whole-result or branch-scoped facts:

- `n in Z` for one generated periodic parameter.
- Distinct integer parameter names for nested or multi-periodic shapes remain deferred in v1.

The formula route must not treat periodic parameters as ordinary unconstrained symbolic coefficients.

### Range Facts

For `sin` and `cos`, the range fact for the generated inverse trig value is global to the wrapper inversion:

- symbolic/compound RHS: `-1 <= rhs <= 1`
- exact numeric RHS outside `[-1,1]`: domain-empty stop before formula handoff
- exact numeric RHS inside the range: no redundant symbolic range fact

For `tan`, no range fact is required.

### Angle Units

Generated branch equations must preserve the existing angle-unit policy from composition/trig:

- radians use `pi` periods and inverse trig directly.
- degrees/grads scale inverse trig and period constants as the current branch generator does.

A live formula route must not hard-code radians after composition has produced degree/grad branch equations.

### Branch Grouping And Readback

The visible answer should be grouped by periodic generated branch, not merged into one anonymous `caseMath` wall.

Recommended detail/answer sections:

- `Trig Formula Cases`
- `Trig Formula Branch 1`, `Trig Formula Branch 2`, etc.
- branch label examples:
  - `F=arcsin(b)+2*pi*n`
  - `F=pi-arcsin(b)+2*pi*n`
  - `F=arctan(b)+pi*n`

Each generated branch keeps its local Cardano/Ferrari definitions and case rows. Formula helper names such as `p`, `q`, `Delta`, `P`, `Q`, and `Y` are local to the visible generated branch group, matching the algebraic-wrapper grouping policy.

### Case Conditions

Cardano/Ferrari row conditions stay row-local:

- discriminant/case guards such as `Delta>0`, `Delta=0`, `Delta<0`
- Ferrari radicand guards such as `F_sigma>=0`
- resolvent guards such as `p+2Y>0`

These are not global `Valid When` facts. Global `Valid When` should include only whole-result facts:

- trig range facts
- integer parameter facts
- denominator exclusions
- leading coefficient facts, when emitted by the formula producer

### Candidate Validation

The trig consumer must provide formula validation evidence only after preserving the original-equation candidate check:

- substitute generated formula candidates back into the generated branch equation;
- preserve branch-local facts and row-local formula conditions;
- preserve wrapper/global trig facts;
- confirm the generated branch family satisfies the original trig equation under its integer-parameter fact.

For symbolic formulas, validation can be structural and fact-preserving rather than numeric evaluation, but the route must not drop the original trig branch provenance.

### Endpoint And Duplicate Policy

Sine and cosine need a duplicate policy at exact endpoints:

- `sin(F)=1`, `sin(F)=-1`, `cos(F)=1`, and `cos(F)=-1` can collapse the two inverse-trig branch equations modulo the period.
- V1 may either dedupe exact endpoint branch equations before formula handoff or keep both branches only when they remain visibly distinct and candidate validation preserves the overlap.
- The recommended v1 behavior is exact endpoint dedupe before formula handoff.

Tangent has no endpoint split and is the safest fallback if sine/cosine dedupe requires a separate slice.

## Recommended First Live Milestone

`EQUATION-TRIG-WRAPPER-FORMULA1`

Scope:

- Real Exact only.
- One-layer `sin(F)=rhs`, `cos(F)=rhs`, and `tan(F)=rhs`.
- Generated degree-3/4 equations may delegate to existing Real Cardano/Ferrari formula routes.
- Direct or safely rational-cleared generated equations are allowed.
- Formula payloads use grouped `caseMath` with branch labels and preserved integer/range/denominator facts.
- Heavy case output relies on `FORMULA-PRESENTATION-PIPELINE2` compact-first behavior.

Required tests:

- `sin(z^3+z+1)=b` -> grouped Real Cardano formula cases with `-1<=b<=1` and `n in Z`.
- `cos(z^4+z+1)=b` -> grouped Real Ferrari formula cases with `-1<=b<=1` and `n in Z`.
- `tan((z^3+z+1)/(z-m))=b` -> generated Cardano formula cases preserving `z-m!=0` and `n in Z`.
- exact out-of-range sine/cosine RHS stops before formula handoff.
- exact endpoint sine/cosine cases dedupe or otherwise preserve overlap safely.
- Complex Exact trig wrappers remain unsupported.
- nested trig wrappers remain unsupported.
- existing direct trig and low-degree composition routes remain stable.

## Deferred Work

- Complex trig formula wrappers: require principal complex inverse-trig and branch policy before live output.
- Nested/mixed trig formula wrappers: require multi-integer parameter scoping, deeper branch provenance, and more aggressive grouped readback.
- Trig-polynomial carrier formulas such as cubic equations in `cos(x)`: related but separate from wrapper formula handoff.
- Broad generated route order widening: formula families remain opt-in by consumer.

## Verification Notes

This is a docs-only policy gate. It inspected the existing composition branch generator, parameterized trig solvers, generated formula payload validation, and Equation mode formula handoff routing. No production route, solver output, Display schema, History, OOE, app-state, Tauri, or copy contract was changed.
