# EQUATION-SQUARE-POWER-WRAPPER-FORMULA-POLICY0

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

The audited future capability is Real Exact one-layer square-power wrapper formula handoff:

```text
F(target)^2 = b
```

where the generated branch equations may safely delegate to existing selected-target solvers, including Cardano for degree 3 and Ferrari for degree 4.

## Current Repo Evidence

- Real square-root wrappers and Real absolute-value wrappers are already live generated formula consumers, but only through explicit wrapper-owned opt-in validation.
- The shared generated formula handoff can carry structured Real `caseMath` payloads, global supplements, detail sections, branch/case-local fact scopes, and answer-domain metadata.
- Absolute-value wrapper formula output added grouped generated formula readback, so multiple generated equations can keep local Cardano/Ferrari definitions and case-local facts without flattening them into one unconditional list.
- Default generated handoff still excludes `cubic-cardano` and `quartic-ferrari`; formula routes are consumed only by wrapper families that supply validation evidence.
- Square powers remain deferred in current repo state. No production code should infer that `F^2=b` may consume generated formulas until a live square-power wrapper milestone supplies wrapper-specific branch generation, validation evidence, and readback tests.

## Mathematical Policy

For Real Exact one-layer square powers, the safe split is:

```text
F(t)^2 = b  ->  F(t)=sqrt(b)  or  F(t)=-sqrt(b), with b>=0.
```

For exact scalar `b<0`, the route should return a real-domain empty stop. For exact scalar `b=0`, the route should collapse to one generated branch:

```text
F(t)=0
```

For symbolic `b`, both branches must remain present under the global fact `b>=0`.

The first live milestone should be square-only (`power = 2`). Higher even powers follow the same broad pattern but require a separate widening decision because they introduce `\sqrt[n]{b}` branch values and a wider notation/branch policy. Odd powers should also remain separate: they are invertible over the reals through real odd-root notation, but they do not need the two-branch nonnegative split that defines square-power wrappers.

## Display And Copy Policy

Future Real square-power formula output should reuse the grouped generated formula readback shape from absolute-value wrappers:

- one visible answer card;
- groups for the generated positive and negative square-root branches when `b` is symbolic or exact positive;
- one group for the `b=0` collapse;
- local Cardano/Ferrari definitions inside each generated branch group;
- global wrapper fact `b>=0` when `b` is symbolic;
- denominator exclusions preserved from generated rational clearing;
- delegated formula case facts preserved inside the branch/case where they were produced;
- Copy Result, To Editor, History, replay, OOE, app-state, Tauri, and persisted schemas continue using existing compatibility surfaces.

The existing exact-zero wrapper readback can be polished before the live square-power route: when a wrapper collapses to one generated branch `F=0`, the answer should avoid noisy redundant grouping while still preserving provenance in details. That polish is presentation/readback cleanup, not a new solver capability, and can be bundled with the live `FORMULA1` implementation.

## Validation Policy

A future live Real square-power wrapper formula route must supply validation evidence for every generated formula payload:

- wrapper back-substitution is validated: `F=sqrt(b)` or `F=-sqrt(b)` plus `b>=0` implies `F^2=b`;
- exact `b=0` collapse is validated as `F=0`;
- exact `b<0` stops before generated formula delegation;
- candidate validation runs against the original wrapper equation or an equivalent fact-preserving chain;
- branch provenance is preserved;
- case-local Cardano/Ferrari conditions are preserved;
- denominator exclusions and formula facts are not lifted globally unless they are truly global;
- dedupe does not merge roots or case rows whose fact scopes differ.

If any generated branch cannot preserve scoped facts or validation evidence, the route should stop honestly rather than returning partial formula output.

## Boundaries

Keep these non-live in the square-power implementation unless explicitly planned:

- Complex Exact square-power wrapper formulas.
- Higher even powers such as `F^4=b`.
- Odd-power wrappers such as `F^3=b`.
- Nested square powers or mixed algebraic wrappers such as `(sqrt(F))^2=b`.
- Absolute-value changes beyond readback polish.
- Carrier-elimination, mixed-algebraic, exp/log, or trig formula handoff.
- Broad generated Cardano/Ferrari route-order widening.
- `RootOf`, implicit-root notation, numeric-only Exact fallback, schema migrations, OOE changes, History changes, app-state changes, or Tauri changes.

## Readiness Decision

Real Exact one-layer square-power formula handoff is now suitable as the next algebraic wrapper family after square-root and absolute-value wrappers, but only if `FORMULA1` stays square-only and supplies wrapper-specific validation evidence.

The route should not be enabled as a generic generated formula flag. It should opt in only from the Real square-power composition consumer, reusing grouped formula readback and preserving local definitions/facts per generated branch.

## Recommended Next Milestone

Prefer a narrow live milestone named:

```text
EQUATION-SQUARE-POWER-WRAPPER-FORMULA1
```

The live milestone should include:

- Real Exact `F(target)^2=b` branch generation with `F=sqrt(b)` and `F=-sqrt(b)`;
- exact `b=0` single-branch collapse;
- exact `b<0` domain-empty stop;
- grouped formula output for generated Cardano/Ferrari branches;
- the small exact-zero generated-branch readback polish;
- rational generated branch coverage where denominator exclusions can be preserved;
- explicit unsupported behavior for Complex square powers, higher even powers, odd powers, nested/mixed algebraic wrappers, exp/log, and trig wrappers.

Suggested manual checks for the live milestone:

- `(z^3+z+1)^2=b`;
- `(z^4+z+1)^2=b`;
- `((z^3+z+1)/(z-m))^2=b`;
- `(z^3+z+1)^2=0`;
- `(z^3+z+1)^2=-1`;
- non-`x` targets;
- Complex Exact unsupported behavior;
- existing square-root and absolute-value wrapper formula outputs unchanged.

## Conclusion

Proceed toward `EQUATION-SQUARE-POWER-WRAPPER-FORMULA1`, but keep it Real Exact, one-layer, and square-only. The current grouped formula substrate is enough to support the shape, provided the live milestone adds square-power-specific branch generation, validation evidence, exact-zero readback polish, and focused regressions.
