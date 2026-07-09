# EQUATION-ABS-WRAPPER-FORMULA-POLICY0

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

This is a policy/readiness audit only. It does not change solver behavior, route order, generated handoff behavior, Display, History, OOE, app-state, Tauri, or persisted schemas.

The audited future capability is Real Exact one-layer absolute-value wrapper formula handoff:

```text
|F(target)| = b
```

where generated branch equations may safely delegate to existing selected-target solvers, including Cardano for degree 3 and Ferrari for degree 4.

## Current Repo Evidence

- `src/lib/equation/composition/core.ts` already models one-layer `Abs` carriers and generates two branch equations: `F=b` and `F=-b`.
- The same generator already records the real wrapper fact `b>=0` and returns a domain-empty stop when the right side is an exact negative scalar.
- `src/lib/equation/parameterized/composition.ts` currently passes generated formula handoff options only for one-layer `square-root` carriers, not for `absolute-value`.
- The current formula promotion helper accepts exactly one Real `caseMath` formula payload. Absolute value usually produces two generated branch equations, so a live abs route would need multi-payload handling before it can render formula output honestly.
- `src/lib/equation/parameterized/generated-branch-handoff.ts` can collect multiple formula payloads, but it does not yet define how a wrapper consumer should promote multiple Real `caseMath` payloads into one visible answer.
- `src/lib/equation/parameterized/generated-formula-validation.ts` can require wrapper back-substitution validation, candidate validation, case preservation, and scoped fact preservation. The existing Real square-root wrapper supplies those evidence flags only for the single generated equation it creates.
- The live capability from `EQUATION-ALGEBRAIC-WRAPPER-FORMULA1` is intentionally narrow: Real Exact one-layer square-root composition only. Absolute value, square powers, nested/mixed algebraic wrappers, exp/log, trig, and Complex square-root wrappers remain non-live.

## Mathematical Policy

Future Real Exact one-layer absolute-value wrapper formula solving should use:

```text
|F(t)| = b  ->  F(t)=b  or  F(t)=-b, with b>=0.
```

For exact scalar `b<0`, the route should stop as domain-empty. For exact scalar `b=0`, the route should solve a single generated branch `F(t)=0` rather than producing duplicate formula payloads. For symbolic `b`, both branches must remain present unless later candidate validation proves a duplicate under the same fact scope.

The branch equations themselves are sufficient for back-substitution when combined with `b>=0`; however, the future payload should still preserve wrapper branch provenance:

- branch `abs-positive`: generated equation `F(t)=b`;
- branch `abs-negative`: generated equation `F(t)=-b`;
- global wrapper fact: `b>=0`;
- branch/case-local formula facts from the delegated solver must stay attached to the branch and case where they were produced.

Do not flatten both branches into a single unconditional root list when a delegated solver returns Real `caseMath`. Cardano and Ferrari Real answers are conditional; absolute value adds another branch layer above those cases.

## Display And Copy Policy

The future live abs wrapper result should use grouped generated formula output:

- visible answer groups for `F=b` and `F=-b`;
- each group may contain its own Real Cardano/Ferrari `caseMath` rows;
- formula definitions stay in detail cards, preserving the existing Cardano/Ferrari compact readback style;
- wrapper facts such as `b>=0` remain global `Valid When` facts;
- denominator exclusions and formula facts remain global only when they are truly global, otherwise they stay branch/case scoped;
- Copy Result, To Editor, History, replay, OOE, app-state, Tauri, and persisted schemas should continue using the canonical compatibility surfaces, not a new persisted display schema.

The current single-payload `caseMath` promotion used by square-root wrappers is not enough for this. A small grouped/multi-payload readback substrate is the missing prerequisite.

## Validation Policy

A future live Real abs wrapper formula route must supply explicit validation evidence for every generated formula payload:

- wrapper back-substitution is validated: `F=b` or `F=-b` plus `b>=0` implies the original absolute-value equation;
- candidates are validated against the original wrapper equation or an equivalent fact-preserving chain;
- case-local Cardano/Ferrari conditions are preserved;
- wrapper branch provenance is preserved;
- denominator exclusions from rational clearing and formula normalization are preserved;
- dedupe never merges roots or case rows whose fact scopes differ.

If any generated branch fails validation or cannot preserve scoped facts, the whole wrapper formula handoff should stop honestly rather than showing a partial formula answer as complete.

## Boundaries

Keep these non-live in the future abs implementation unless explicitly planned:

- Complex Exact absolute-value formula wrappers. Complex `Abs` is magnitude, not a real sign split.
- Nested absolute-value wrappers.
- Mixed algebraic wrappers such as `|F| + sqrt(G) = b`.
- Square-power wrappers.
- Carrier-elimination, mixed-algebraic, exp/log, or trig formula handoff.
- Broad generated Cardano/Ferrari route-order widening.
- `RootOf`, implicit-root notation, numeric-only Exact fallback, schema migrations, OOE changes, History changes, app-state changes, or Tauri changes.

## Readiness Decision

Real Exact one-layer absolute-value formula handoff is mathematically suitable as the next wrapper family, but it is not ready as a one-line flag change.

The missing prerequisite is grouped generated formula payload/readback handling for multiple generated equations. Without that, an abs wrapper would either:

- flatten two conditional formula payloads into an unconditional answer;
- discard branch provenance;
- merge global and case-local facts incorrectly;
- or fail to display two Cardano/Ferrari case payloads clearly.

## Recommended Next Milestone

Prefer a narrow live milestone named:

```text
EQUATION-ABS-WRAPPER-FORMULA1
```

but its implementation plan must explicitly include the grouped/multi-payload substrate inside the milestone. If the plan feels large, split out:

```text
EQUATION-GENERATED-FORMULA-GROUPED-PAYLOAD1
```

first, then implement `EQUATION-ABS-WRAPPER-FORMULA1`.

The live milestone should test:

- `|z^3+z+1|=b` in Real Exact through grouped Cardano case output;
- `|z^4+z+1|=b` in Real Exact through grouped Ferrari case output;
- rational-cleared variants such as `|(z^3+z+1)/(z-m)|=b` and `|(z^4+z+1)/(z-m)|=b`;
- exact `b<0` domain-empty stops;
- exact `b=0` duplicate-branch collapse;
- non-`x` targets;
- Complex Exact unsupported behavior;
- existing simple absolute-value carrier behavior such as `|z-a|=b`;
- square-root wrapper formula output unchanged.

## Conclusion

Proceed toward Real absolute-value wrapper formulas next, but only with grouped formula payload/readback in scope. Do not enable abs formula handoff by merely passing the existing square-root `formulaHandoff` option through `absolute-value`.
